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

  it("updates project targets via PUT /v1/projects/:id", async () => {
    const created = await createProject(db, { tenantId: acme, name: "p1", targets: [] });
    const newTarget = { kind: "git-repository", id: "t1", name: "repo", remoteUrl: "https://github.com/org/repo.git", ref: "main" };
    
    const response = await app.inject({
      method: "PUT",
      url: `/v1/projects/${created.id}`,
      headers: auth(acme),
      payload: { name: "p1-updated", targets: [newTarget] },
    });

    expect(response.statusCode).toBe(200);
    const { project } = response.json();
    expect(project.name).toBe("p1-updated");
    expect(project.targets).toHaveLength(1);
    expect(project.targets[0].remoteUrl).toBe("https://github.com/org/repo.git");
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

  it("handles localPath git repository monitoring and updates last_monitored_at", async () => {
    const project = await createProject(db, {
      tenantId: acme,
      name: "local-git-project",
      targets: [
        {
          id: "repo_local",
          kind: "git-repository",
          name: "local-payments",
          localPath: "fixtures/java-payments",
        },
      ] as never,
    });

    const res = await app.inject({
      method: "POST",
      url: `/v1/projects/${project.id}/monitor`,
      headers: auth(acme),
    });
    expect(res.statusCode).toBe(202);
    expect(res.json().status).toBe("scan-queued");
    expect(res.json().commitHash).toMatch(/^[0-9a-f]{40}$/i);

    // Verify last_monitored_at was updated in project list
    const projRes = await app.inject({
      method: "GET",
      url: "/v1/projects",
      headers: auth(acme),
    });
    const found = projRes.json().projects.find((p: { id: string }) => p.id === project.id);
    expect(found.lastMonitoredAt).toBeTruthy();
  });

  it("returns no-git-targets when project has no valid remote or local git path", async () => {
    const project = await createProject(db, {
      tenantId: acme,
      name: "no-git-project",
      targets: [
        {
          id: "repo_invalid",
          kind: "git-repository",
          name: "invalid-target",
        },
      ] as never,
    });

    const res = await app.inject({
      method: "POST",
      url: `/v1/projects/${project.id}/monitor`,
      headers: auth(acme),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe("no-git-targets");
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

describe("watchtower continuous monitoring", () => {
  it("allows a tenant to configure project monitoring and enforces tenant isolation", async () => {
    const projRes = await app.inject({
      method: "POST",
      url: "/v1/projects",
      headers: auth(acme),
      payload: { name: "monitored-proj", targets: [] },
    });
    const project = projRes.json().project;

    const monitorRes = await app.inject({
      method: "POST",
      url: `/v1/projects/${project.id}/monitoring`,
      headers: auth(acme),
      payload: { enabled: true, interval: 30 },
    });
    expect(monitorRes.statusCode).toBe(200);
    expect(monitorRes.json()).toEqual({ success: true });

    const getRes = await app.inject({
      method: "GET",
      url: `/v1/projects/${project.id}`,
      headers: auth(acme),
    });
    expect(getRes.json().project.monitoringEnabled).toBe(true);
    expect(getRes.json().project.monitoringInterval).toBe(30);

    const monitorGlobexRes = await app.inject({
      method: "POST",
      url: `/v1/projects/${project.id}/monitoring`,
      headers: auth(globex),
      payload: { enabled: false, interval: 10 },
    });
    expect(monitorGlobexRes.statusCode).toBe(404);

    const invalidRes = await app.inject({
      method: "POST",
      url: `/v1/projects/${project.id}/monitoring`,
      headers: auth(acme),
      payload: { enabled: true, interval: 0 },
    });
    expect(invalidRes.statusCode).toBe(400);
  });

  it("checks database listActiveMonitoredProjects filter correctly", async () => {
    const projRes = await app.inject({
      method: "POST",
      url: "/v1/projects",
      headers: auth(acme),
      payload: { name: "active-mon-test", targets: [] },
    });
    const project = projRes.json().project;

    const { listActiveMonitoredProjects, getProject, updateProjectMonitoring, updateProjectLastMonitored } = await import("@ironbastion/db");

    let active = await listActiveMonitoredProjects(db);
    expect(active.some((p) => p.id === project.id)).toBe(false);

    await updateProjectMonitoring(db, acme, project.id, true, 45);

    active = await listActiveMonitoredProjects(db);
    const found = active.find((p) => p.id === project.id);
    expect(found).toBeDefined();
    expect(found?.monitoringEnabled).toBe(true);
    expect(found?.monitoringInterval).toBe(45);

    await updateProjectLastMonitored(db, project.id);
    const updated = await getProject(db, acme, project.id);
    expect(updated?.lastMonitoredAt).not.toBeNull();
  });
});

describe("zip upload scanning", () => {
  it("rejects unauthenticated upload requests", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/scans/upload",
    });
    expect(res.statusCode).toBe(401);
  });

  it("enforces tenant boundaries on ZIP uploads", async () => {
    const project = await createProject(db, {
      tenantId: acme,
      name: "acme-zip-project",
      targets: [],
    });

    const res = await app.inject({
      method: "POST",
      url: `/v1/projects/${project.id}/scans/upload`,
      headers: auth(globex),
    });
    expect(res.statusCode).toBe(404);
  });

  it("accepts a valid ZIP upload and queues a scan with zip-archive target", async () => {
    const project = await createProject(db, {
      tenantId: acme,
      name: "zip-scan-project",
      targets: [],
    });

    const AdmZip = (await import("adm-zip")).default;
    const zip = new AdmZip();
    zip.addFile("src/index.js", Buffer.from("console.log('hello');"));
    const zipBuffer = zip.toBuffer();

    // Construct multipart form payload
    const boundary = "--------------------------1234567890";
    const body = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="project.zip"\r\nContent-Type: application/zip\r\n\r\n`
      ),
      zipBuffer,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const res = await app.inject({
      method: "POST",
      url: `/v1/projects/${project.id}/scans/upload`,
      headers: {
        ...auth(acme),
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    });

    expect(res.statusCode).toBe(202);
    const scan = res.json().scan;
    expect(scan).toBeDefined();
    expect(scan.targets[0].kind).toBe("zip-archive");
    expect(scan.targets[0].name).toBe("project.zip");

    // Also test form field projectId via /v1/scans/upload
    const formBody = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="projectId"\r\n\r\n${project.id}\r\n` +
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="project.zip"\r\nContent-Type: application/zip\r\n\r\n`
      ),
      zipBuffer,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const res2 = await app.inject({
      method: "POST",
      url: "/v1/scans/upload",
      headers: {
        ...auth(acme),
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
      payload: formBody,
    });
    expect(res2.statusCode).toBe(202);
    expect(res2.json().scan).toBeDefined();
  });

  it("rejects non-ZIP files and Zip Slip archives", async () => {
    const project = await createProject(db, {
      tenantId: acme,
      name: "zip-security-project",
      targets: [],
    });

    const boundary = "--------------------------9876543210";

    // 1. Non-zip extension
    const nonZipBody = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="script.sh"\r\nContent-Type: text/plain\r\n\r\necho evil\r\n--${boundary}--\r\n`
      ),
    ]);

    const res1 = await app.inject({
      method: "POST",
      url: `/v1/projects/${project.id}/scans/upload`,
      headers: {
        ...auth(acme),
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
      payload: nonZipBody,
    });
    expect(res1.statusCode).toBe(400);

    // 2. Zip Slip archive
    const AdmZip = (await import("adm-zip")).default;
    const dummyName = "DUMMY_PATH_12345";
    const evilName  = "../etc/evil.file";
    const slipZip = new AdmZip();
    slipZip.addFile(dummyName, Buffer.from("echo hacked"));
    const slipBuffer = slipZip.toBuffer();
    
    let pos = 0;
    const dummyBuf = Buffer.from(dummyName);
    const evilBuf = Buffer.from(evilName);
    while ((pos = slipBuffer.indexOf(dummyBuf, pos)) !== -1) {
      evilBuf.copy(slipBuffer, pos);
      pos += dummyBuf.length;
    }

    const slipBody = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="slip.zip"\r\nContent-Type: application/zip\r\n\r\n`
      ),
      slipBuffer,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const res2 = await app.inject({
      method: "POST",
      url: `/v1/projects/${project.id}/scans/upload`,
      headers: {
        ...auth(acme),
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
      payload: slipBody,
    });
    expect(res2.statusCode).toBe(400);
    expect(res2.json().error).toContain("security validation failed");
  });
});

describe("github app integration", () => {
  it("rejects unauthenticated github integration requests", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/integrations/github/status",
    });
    expect(res.statusCode).toBe(401);
  });

  it("returns github app status correctly", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/integrations/github/status",
      headers: auth(acme),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty("configured");
    expect(body).toHaveProperty("connected");
  });

  it("generates correct installation URL with slugified app name", async () => {
    const origId = process.env["GITHUB_APP_ID"];
    const origKey = process.env["GITHUB_APP_PRIVATE_KEY"];
    const origName = process.env["GITHUB_APP_NAME"];

    process.env["GITHUB_APP_ID"] = "12345";
    process.env["GITHUB_APP_PRIVATE_KEY"] = "-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0Z...\n-----END RSA PRIVATE KEY-----";
    process.env["GITHUB_APP_NAME"] = "IronBastion Local";

    try {
      const res = await app.inject({
        method: "GET",
        url: "/v1/integrations/github/connect",
        headers: auth(acme),
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.configured).toBe(true);
      expect(body.url).toContain("https://github.com/apps/ironbastion-local/installations/new?state=");
    } finally {
      if (origId !== undefined) process.env["GITHUB_APP_ID"] = origId; else delete process.env["GITHUB_APP_ID"];
      if (origKey !== undefined) process.env["GITHUB_APP_PRIVATE_KEY"] = origKey; else delete process.env["GITHUB_APP_PRIVATE_KEY"];
      if (origName !== undefined) process.env["GITHUB_APP_NAME"] = origName; else delete process.env["GITHUB_APP_NAME"];
    }
  });

  it("rejects invalid state tokens in callback", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/integrations/github/callback?state=invalid_state_token&installation_id=123",
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toContain("Invalid or expired state");
  });

  it("persists and isolates tenant github installations", async () => {
    const { saveGithubInstallation } = await import("@ironbastion/db");
    await saveGithubInstallation(db, acme, {
      githubInstallationId: "inst_acme_999",
      accountLogin: "acme-corp",
      accountType: "Organization",
    });

    const acmeStatus = await app.inject({
      method: "GET",
      url: "/v1/integrations/github/status",
      headers: auth(acme),
    });
    expect(acmeStatus.statusCode).toBe(200);
    expect(acmeStatus.json().connected).toBe(true);
    expect(acmeStatus.json().installation.accountLogin).toBe("acme-corp");

    // Verify tenant isolation (Globex should not see Acme installation)
    const globexStatus = await app.inject({
      method: "GET",
      url: "/v1/integrations/github/status",
      headers: auth(globex),
    });
    expect(globexStatus.statusCode).toBe(200);
    expect(globexStatus.json().connected).toBe(false);
    expect(globexStatus.json().installation).toBeNull();
  });

  it("allows tenant to disconnect github installation", async () => {
    const delRes = await app.inject({
      method: "DELETE",
      url: "/v1/integrations/github",
      headers: auth(acme),
    });
    expect(delRes.statusCode).toBe(200);
    expect(delRes.json().success).toBe(true);

    const statusRes = await app.inject({
      method: "GET",
      url: "/v1/integrations/github/status",
      headers: auth(acme),
    });
    expect(statusRes.json().connected).toBe(false);
  });
});
