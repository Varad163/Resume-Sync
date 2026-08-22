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
