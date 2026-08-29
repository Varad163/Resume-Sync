/**
 * Route-level tests. These use Fastify's inject, a real embedded database and
 * the real in-process queue, so what is exercised is the actual stack minus the
 * network.
 */
import { beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createEmbedded, migrate, createTenant, createProject, type Database } from "@ironbastion/db";
import { createInProcessQueue, type ScanMessage } from "@ironbastion/runner";
import { createAuthenticator } from "./auth.js";
import { createServer } from "./server.js";

let app: FastifyInstance;
let db: Database;
let acme: string;
let globex: string;
let enqueued: ScanMessage[];

const auth = (tenantId: string) => ({ authorization: `Bearer dev.${tenantId}.eng@test` });

beforeEach(async () => {
  db = await createEmbedded();
  await migrate(db);
  acme = (await createTenant(db, "Acme")).id;
  globex = (await createTenant(db, "Globex")).id;
  enqueued = [];

  const queue = createInProcessQueue((message) => enqueued.push(message));
  app = await createServer({
    db,
    queue,
    auth: createAuthenticator({ IRONBASTION_AUTH: "dev" } as NodeJS.ProcessEnv),
  });
});

describe("health", () => {
  it("is public and reports how the server is wired", async () => {
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: "ok", auth: "dev", queue: "in-process" });
  });
});

describe("authentication", () => {
  it("refuses a request with no token", async () => {
    const response = await app.inject({ method: "GET", url: "/v1/projects" });
    expect(response.statusCode).toBe(401);
    expect(response.json().message).toContain("missing bearer token");
  });

  it("refuses a malformed token", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/v1/projects",
      headers: { authorization: "Bearer nonsense" },
    });
    expect(response.statusCode).toBe(401);
  });

  it("rejects dev tokens unless dev auth is explicitly enabled", () => {
    expect(() => createAuthenticator({} as NodeJS.ProcessEnv)).toThrow(/COGNITO_USER_POOL_ID/);
  });
});

describe("projects", () => {
  it("creates a project and returns it to its own tenant only", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/v1/projects",
      headers: auth(acme),
      payload: { name: "payments", targets: [] },
    });
    expect(created.statusCode).toBe(201);
    const { project } = created.json();

    const mine = await app.inject({ method: "GET", url: "/v1/projects", headers: auth(acme) });
    expect(mine.json().projects).toHaveLength(1);

    const theirs = await app.inject({ method: "GET", url: "/v1/projects", headers: auth(globex) });
    expect(theirs.json().projects).toEqual([]);

    const direct = await app.inject({
      method: "GET",
      url: `/v1/projects/${project.id}`,
      headers: auth(globex),
    });
    expect(direct.statusCode).toBe(404);
  });

  it("requires a name", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/projects",
      headers: auth(acme),
      payload: {},
    });
    expect(response.statusCode).toBe(400);
  });
});

describe("scans", () => {
  const targets = [{ kind: "tls-endpoint", id: "e1", host: "api.test", port: 443 }];

  it("queues a scan and returns 202", async () => {
    const project = await createProject(db, { tenantId: acme, name: "p", targets: targets as never });
    const response = await app.inject({
      method: "POST",
      url: "/v1/scans",
      headers: auth(acme),
      payload: { projectId: project.id },
    });

    expect(response.statusCode).toBe(202);
    const { scan } = response.json();
    expect(scan.status).toBe("queued");
    expect(enqueued).toEqual([{ scanId: scan.id, tenantId: acme }]);
  });

  it("refuses to scan another tenant's project", async () => {
    const project = await createProject(db, { tenantId: acme, name: "p", targets: targets as never });
    const response = await app.inject({
      method: "POST",
      url: "/v1/scans",
      headers: auth(globex),
      payload: { projectId: project.id },
    });
    expect(response.statusCode).toBe(404);
    expect(enqueued).toEqual([]);
  });

  it("refuses a project with nothing to scan", async () => {
    const project = await createProject(db, { tenantId: acme, name: "empty", targets: [] });
    const response = await app.inject({
      method: "POST",
      url: "/v1/scans",
      headers: auth(acme),
      payload: { projectId: project.id },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error).toContain("no targets");
  });

  it("404s an unknown scan rather than leaking its existence", async () => {
    const project = await createProject(db, { tenantId: acme, name: "p", targets: targets as never });
    const created = await app.inject({
      method: "POST",
      url: "/v1/scans",
      headers: auth(acme),
      payload: { projectId: project.id },
    });
    const { scan } = created.json();

    for (const path of ["", "/findings", "/cbom", "/plan", "/report"]) {
      const response = await app.inject({
        method: "GET",
        url: `/v1/scans/${scan.id}${path}`,
        headers: auth(globex),
      });
      expect(response.statusCode).toBe(404);
    }
  });

  it("returns an empty finding list for a scan that has not run", async () => {
    const project = await createProject(db, { tenantId: acme, name: "p", targets: targets as never });
    const created = await app.inject({
      method: "POST",
      url: "/v1/scans",
      headers: auth(acme),
      payload: { projectId: project.id },
    });
    const { scan } = created.json();

    const findings = await app.inject({
      method: "GET",
      url: `/v1/scans/${scan.id}/findings`,
      headers: auth(acme),
    });
    expect(findings.statusCode).toBe(200);
    expect(findings.json().findings).toEqual([]);
  });

  it("exposes the certificate public verification key anonymously", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/v1/certificate-public-key",
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().publicKey).toContain("-----BEGIN RSA PUBLIC KEY-----");
  });

  it("returns 404/400 for certificate requests of scans that have not completed or don't exist", async () => {
    // Unknown scan
    const response1 = await app.inject({
      method: "GET",
      url: "/v1/scans/unknown-scan-id/certificate",
      headers: auth(acme),
    });
    expect(response1.statusCode).toBe(404);

    // Known scan without CBOM (not completed yet)
    const project = await createProject(db, { tenantId: acme, name: "p", targets: targets as never });
    const created = await app.inject({
      method: "POST",
      url: "/v1/scans",
      headers: auth(acme),
      payload: { projectId: project.id },
    });
    const { scan } = created.json();

    const response2 = await app.inject({
      method: "GET",
      url: `/v1/scans/${scan.id}/certificate`,
      headers: auth(acme),
    });
    expect(response2.statusCode).toBe(400);
    expect(response2.json().error).toContain("no CBOM available");
  });

  it("allows a tenant to query, customize, and reset a migration plan, and protects tenant boundaries", async () => {
    // 1. Setup a project and scan
    const project = await createProject(db, {
      tenantId: acme,
      name: "custom-plan-project",
      targets: [{ kind: "tls-endpoint", id: "e1", host: "api.test", port: 443 }] as never,
    });
    const scanResponse = await app.inject({
      method: "POST",
      url: "/v1/scans",
      headers: auth(acme),
      payload: { projectId: project.id },
    });
    const { scan } = scanResponse.json();

    const mockPlanDoc = {
      scanId: scan.id,
      generatedAt: new Date().toISOString(),
      summary: "AI plan",
      totalEffortDays: 8,
      milestoneRisks: [],
      provenance: {
        source: "agent",
        agentId: "agent_migrate",
        model: "model_migrate",
        promptVersion: "1.0",
        inputTokens: 10,
        outputTokens: 10,
        rationale: "",
        decidedAt: new Date().toISOString(),
      },
      waves: [
        {
          id: "wave_1",
          name: "Wave 1",
          rationale: "",
          milestoneId: "deprecation-2030",
          actions: [
            {
              id: "action_1",
              findingIds: ["f1"],
              component: "auth",
              currentAlgorithm: "AES-128",
              targetAlgorithm: "AES-256",
              approach: "parameter-change",
              effort: "M",
              severity: "medium",
              rationale: "",
              dependsOn: [],
              risks: [],
              validation: [],
            },
          ],
        },
      ],
    };

    // Save the original plan artefact directly to DB
    await db.query(
      `INSERT INTO artefacts (scan_id, tenant_id, kind, document) VALUES ($1, $2, $3, $4)`,
      [scan.id, acme, "plan", JSON.stringify(mockPlanDoc)],
    );

    // 2. GET scan plan
    const getRes = await app.inject({
      method: "GET",
      url: `/v1/scans/${scan.id}/plan`,
      headers: auth(acme),
    });
    expect(getRes.statusCode).toBe(200);
    expect(getRes.json().plan.summary).toBe("AI plan");
    expect(getRes.json().customPlan).toBeNull();

    // 3. POST custom-plan (reassigning action to another wave but keeping integrity)
    const customPlanDoc = {
      ...mockPlanDoc,
      summary: "Custom plan",
      waves: [
        {
          id: "wave_1",
          name: "Wave 1",
          rationale: "",
          milestoneId: "deprecation-2030",
          actions: [], // Action moved out of Wave 1
        },
        {
          id: "wave_2",
          name: "Wave 2",
          rationale: "",
          milestoneId: "deprecation-2030",
          actions: [mockPlanDoc.waves[0]!.actions[0]!], // Action moved here
        },
      ],
    };

    // Try posting with a different tenant (globex) - should return 404/400 due to tenant isolation
    const globexPostRes = await app.inject({
      method: "POST",
      url: `/v1/scans/${scan.id}/plan/custom`,
      headers: auth(globex),
      payload: { plan: customPlanDoc },
    });
    expect(globexPostRes.statusCode).toBe(404); // Original plan not found for globex

    // Post as acme
    const acmePostRes = await app.inject({
      method: "POST",
      url: `/v1/scans/${scan.id}/plan/custom`,
      headers: auth(acme),
      payload: { plan: customPlanDoc },
    });
    expect(acmePostRes.statusCode).toBe(200);
    expect(acmePostRes.json().plan.summary).toBe("Custom plan");

    // Fetch again as acme to verify customPlan is returned
    const getRes2 = await app.inject({
      method: "GET",
      url: `/v1/scans/${scan.id}/plan`,
      headers: auth(acme),
    });
    expect(getRes2.statusCode).toBe(200);
    expect(getRes2.json().customPlan.summary).toBe("Custom plan");

    // Try deleting as globex - should be silent/isolated
    const globexDeleteRes = await app.inject({
      method: "DELETE",
      url: `/v1/scans/${scan.id}/plan/custom`,
      headers: auth(globex),
    });
    expect(globexDeleteRes.statusCode).toBe(200);

    // Fetch again as acme to verify customPlan is still there
    const getRes3 = await app.inject({
      method: "GET",
      url: `/v1/scans/${scan.id}/plan`,
      headers: auth(acme),
    });
    expect(getRes3.json().customPlan).not.toBeNull();

    // Reset as acme
    const acmeDeleteRes = await app.inject({
      method: "DELETE",
      url: `/v1/scans/${scan.id}/plan/custom`,
      headers: auth(acme),
    });
    expect(acmeDeleteRes.statusCode).toBe(200);

    // Verify reset reverted to original
    const getRes4 = await app.inject({
      method: "GET",
      url: `/v1/scans/${scan.id}/plan`,
      headers: auth(acme),
    });
    expect(getRes4.json().customPlan).toBeNull();
  });

  it("returns insufficient-history when a project has fewer than 2 scans", async () => {
    const project = await createProject(db, { tenantId: acme, name: "watchtower-project", targets: [] });
    const response = await app.inject({
      method: "GET",
      url: `/v1/projects/${project.id}/watchtower`,
      headers: auth(acme),
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe("insufficient-history");
    expect(response.json().history).toBeDefined();
  });

  it("refuses to query watchtower for another tenant's project", async () => {
    const project = await createProject(db, { tenantId: acme, name: "private-project", targets: [] });
    const response = await app.inject({
      method: "GET",
      url: `/v1/projects/${project.id}/watchtower`,
      headers: auth(globex),
    });
    expect(response.statusCode).toBe(404);
  });

  it("allows monitor checking and triggers scan on SHA difference", async () => {
    const project = await createProject(db, {
      tenantId: acme,
      name: "payments-git",
      targets: [
        {
          id: "repo_demo",
          kind: "git-repository",
          name: "payments",
          remoteUrl: "/home/hp/Internship/RungtaVenture/IronBastion",
        },
      ] as never,
    });

    // 1. Initial monitor check when there is no scan history - should trigger a scan immediately
    const res1 = await app.inject({
      method: "POST",
      url: `/v1/projects/${project.id}/monitor`,
      headers: auth(acme),
    });
    expect(res1.statusCode).toBe(202);
    expect(res1.json().status).toBe("scan-queued");
    expect(res1.json().commitHash).toHaveLength(40);

    const scanId = res1.json().scan.id;

    // Simulate scan success and record commitHash
    await db.query(
      `UPDATE scans SET status = 'succeeded', finished_at = now(), targets = $1 WHERE id = $2`,
      [
        JSON.stringify([
          {
            id: "repo_demo",
            kind: "git-repository",
            name: "payments",
            remoteUrl: "/home/hp/Internship/RungtaVenture/IronBastion",
            commitHash: res1.json().commitHash,
          },
        ]),
        scanId,
      ],
    );

    // 2. Monitor checking again with same SHA - should return up-to-date and NOT trigger scan
    const res2 = await app.inject({
      method: "POST",
      url: `/v1/projects/${project.id}/monitor`,
      headers: auth(acme),
    });
    expect(res2.statusCode).toBe(200);
    expect(res2.json().status).toBe("up-to-date");
    expect(res2.json().commitHash).toBe(res1.json().commitHash);

    // 3. Query watchtower to verify history returns the scan
    const watchtowerRes = await app.inject({
      method: "GET",
      url: `/v1/projects/${project.id}/watchtower`,
      headers: auth(acme),
    });
    expect(watchtowerRes.statusCode).toBe(200);
    expect(watchtowerRes.json().history).toHaveLength(1);
    expect(watchtowerRes.json().history[0].id).toBe(scanId);

    // 4. Refuse monitor query from globex (tenant isolation)
    const globexRes = await app.inject({
      method: "POST",
      url: `/v1/projects/${project.id}/monitor`,
      headers: auth(globex),
    });
    expect(globexRes.statusCode).toBe(404);
  });
});

describe("forge", () => {
  it("allows querying, uploading, and verifies tenant boundaries", async () => {
    const project = await createProject(db, {
      tenantId: acme,
      name: "forge-project",
      targets: [{ kind: "tls-endpoint", id: "t1", host: "api.test", port: 443 }] as never,
    });
    const scanResponse = await app.inject({
      method: "POST",
      url: "/v1/scans",
      headers: auth(acme),
      payload: { projectId: project.id },
    });
    const { scan } = scanResponse.json();

    const getRes1 = await app.inject({
      method: "GET",
      url: `/v1/scans/${scan.id}/forge`,
      headers: auth(acme),
    });
    expect(getRes1.statusCode).toBe(200);
    expect(getRes1.json().report).toBeNull();

    const mockReport = {
      scanId: scan.id,
      targetId: "t1",
      overallStatus: "verified",
      checks: [
        {
          id: "downgrade_resistance",
          name: "Downgrade Resistance",
          description: "Verify downgrade rejection",
          status: "pass",
          severity: "high",
          logs: ["Legacy protocol rejected."],
        },
      ],
      traces: [
        {
          name: "Init",
          message: "Starting connection",
          status: "success",
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const postRes1 = await app.inject({
      method: "POST",
      url: `/v1/scans/${scan.id}/forge/results`,
      headers: auth(acme),
      payload: { report: mockReport },
    });
    expect(postRes1.statusCode).toBe(200);
    expect(postRes1.json().status).toBe("success");

    const getRes2 = await app.inject({
      method: "GET",
      url: `/v1/scans/${scan.id}/forge`,
      headers: auth(acme),
    });
    expect(getRes2.statusCode).toBe(200);
    expect(getRes2.json().report.overallStatus).toBe("verified");
    expect(getRes2.json().report.checks).toHaveLength(1);

    const globexGetRes = await app.inject({
      method: "GET",
      url: `/v1/scans/${scan.id}/forge`,
      headers: auth(globex),
    });
    expect(globexGetRes.statusCode).toBe(404);

    const globexPostRes = await app.inject({
      method: "POST",
      url: `/v1/scans/${scan.id}/forge/results`,
      headers: auth(globex),
      payload: { report: mockReport },
    });
    expect(globexPostRes.statusCode).toBe(404);
  });
});

describe("audit", () => {
  it("records project and scan creation against the acting user", async () => {
    await app.inject({
      method: "POST",
      url: "/v1/projects",
      headers: auth(acme),
      payload: { name: "payments", targets: [] },
    });

    const audit = await app.inject({ method: "GET", url: "/v1/audit", headers: auth(acme) });
    expect(audit.json().entries[0]).toMatchObject({
      action: "project.create",
      actor: "eng@test",
    });

    const otherTenant = await app.inject({ method: "GET", url: "/v1/audit", headers: auth(globex) });
    expect(otherTenant.json().entries).toEqual([]);
  });
});
