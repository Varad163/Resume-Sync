/**
 * Runs against PGlite — real PostgreSQL, in-process. The isolation tests below
 * are the ones that matter: they are the difference between a multi-tenant
 * product and an incident.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_SCAN_OPTIONS, EMPTY_STATS, type Finding } from "@ironbastion/core";
import { createEmbedded, migrate, type Database } from "./driver.js";
import {
  completeScan,
  createProject,
  createScan,
  createTenant,
  getArtefact,
  getProject,
  getScan,
  listAudit,
  listFindings,
  listProjects,
  listScans,
  recordAudit,
  updateScanPhase,
  upsertUser,
  findUserByEmail,
} from "./repositories.js";

let db: Database;
let acme: string;
let globex: string;

beforeEach(async () => {
  db = await createEmbedded();
  await migrate(db);
  acme = (await createTenant(db, "Acme Payments")).id;
  globex = (await createTenant(db, "Globex")).id;
});

const finding = (id: string, tenantId: string, scanId: string): Finding =>
  ({
    id,
    scanId,
    algorithm: "RSA",
    primitive: "public-key-encryption",
    parameters: { keySize: 2048 },
    quantum: "broken",
    title: "RSA-2048",
    description: "",
    component: "payments",
    ambiguity: [],
    provenance: { source: "collector", collectorId: "jvm-source", collectorVersion: "1", ruleId: "R", confidence: 1, evidence: [] },
    adjudication: {
      status: "confirmed",
      confidence: 0.9,
      reachability: "runtime",
      dataLifetime: "long",
      exposure: "external",
      rationale: "",
      provenance: { source: "agent", agentId: "sentinel", model: "claude-opus-5", promptVersion: "1", inputTokens: 1, outputTokens: 1, rationale: "", decidedAt: "2026-08-22T00:00:00.000Z" },
    },
    risk: { score: 91, severity: "critical", factors: { quantumExposure: 1, dataLifetime: 1, reachability: 1, networkExposure: 1, migrationDifficulty: 1 }, explanation: "" },
    ...(tenantId ? {} : {}),
  }) as Finding;

describe("schema and migrations", () => {
  it("is idempotent", async () => {
    await expect(migrate(db)).resolves.not.toThrow();
  });
});

describe("projects", () => {
  it("round-trips targets as structured data", async () => {
    const project = await createProject(db, {
      tenantId: acme,
      name: "payments",
      targets: [{ kind: "tls-endpoint", id: "e1", host: "api.acme.test", port: 443 }],
    });
    const loaded = await getProject(db, acme, project.id);
    expect(loaded?.targets[0]).toMatchObject({ kind: "tls-endpoint", host: "api.acme.test" });
  });

  it("never returns another tenant's project", async () => {
    const project = await createProject(db, { tenantId: acme, name: "payments", targets: [] });
    expect(await getProject(db, globex, project.id)).toBeUndefined();
    expect(await listProjects(db, globex)).toEqual([]);
  });
});

describe("scans", () => {
  it("moves through phases and completes with artefacts", async () => {
    const project = await createProject(db, { tenantId: acme, name: "payments", targets: [] });
    const scan = await createScan(db, {
      tenantId: acme,
      projectId: project.id,
      targets: [],
      options: DEFAULT_SCAN_OPTIONS,
    });
    expect(scan.status).toBe("queued");

    await updateScanPhase(db, scan.id, "ANALYZE");
    expect((await getScan(db, acme, scan.id))?.phase).toBe("ANALYZE");

    await completeScan(db, {
      scanId: scan.id,
      tenantId: acme,
      stats: { ...EMPTY_STATS, candidatesFound: 3 },
      notes: ["one note"],
      posture: { overall: 91, severity: "critical", counts: { critical: 1 } },
      findings: [finding("f1", acme, scan.id)],
      cbom: { bomFormat: "CycloneDX", specVersion: "1.6", components: [] } as never,
      plan: { scanId: scan.id, waves: [] } as never,
      inventory: { summary: "s", observations: [] },
    });

    const done = await getScan(db, acme, scan.id);
    expect(done?.status).toBe("succeeded");
    expect(done?.finishedAt).toBeTruthy();
    expect(done?.stats.candidatesFound).toBe(3);

    const findings = await listFindings(db, acme, scan.id);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.risk.score).toBe(91);

    expect(await getArtefact(db, acme, scan.id, "cbom")).toMatchObject({ specVersion: "1.6" });
  });

  it("keeps one tenant's findings invisible to another", async () => {
    const project = await createProject(db, { tenantId: acme, name: "payments", targets: [] });
    const scan = await createScan(db, { tenantId: acme, projectId: project.id, targets: [], options: DEFAULT_SCAN_OPTIONS });
    await completeScan(db, {
      scanId: scan.id,
      tenantId: acme,
      stats: EMPTY_STATS,
      notes: [],
      posture: { overall: 91, severity: "critical", counts: {} },
      findings: [finding("f1", acme, scan.id)],
      cbom: {} as never,
      plan: {} as never,
      inventory: {},
    });

    expect(await getScan(db, globex, scan.id)).toBeUndefined();
    expect(await listFindings(db, globex, scan.id)).toEqual([]);
    expect(await getArtefact(db, globex, scan.id, "cbom")).toBeUndefined();
    expect(await listScans(db, globex)).toEqual([]);
  });

  it("filters findings by severity and status", async () => {
    const project = await createProject(db, { tenantId: acme, name: "p", targets: [] });
    const scan = await createScan(db, { tenantId: acme, projectId: project.id, targets: [], options: DEFAULT_SCAN_OPTIONS });
    const low = {
      ...finding("f2", acme, scan.id),
      risk: { ...finding("f2", acme, scan.id).risk, severity: "low" as const, score: 12 },
    };
    await completeScan(db, {
      scanId: scan.id,
      tenantId: acme,
      stats: EMPTY_STATS,
      notes: [],
      posture: { overall: 91, severity: "critical", counts: {} },
      findings: [finding("f1", acme, scan.id), low],
      cbom: {} as never,
      plan: {} as never,
      inventory: {},
    });

    expect(await listFindings(db, acme, scan.id, { severity: "critical" })).toHaveLength(1);
    expect(await listFindings(db, acme, scan.id, { severity: "low" })).toHaveLength(1);
    expect((await listFindings(db, acme, scan.id))[0]?.risk.score).toBe(91);
  });

  it("lists scans newest first, scoped to a project", async () => {
    const a = await createProject(db, { tenantId: acme, name: "a", targets: [] });
    const b = await createProject(db, { tenantId: acme, name: "b", targets: [] });
    await createScan(db, { tenantId: acme, projectId: a.id, targets: [], options: DEFAULT_SCAN_OPTIONS });
    await createScan(db, { tenantId: acme, projectId: b.id, targets: [], options: DEFAULT_SCAN_OPTIONS });
    expect(await listScans(db, acme)).toHaveLength(2);
    expect(await listScans(db, acme, { projectId: a.id })).toHaveLength(1);
  });
});

describe("users", () => {
  it("is unique per tenant and email, and updatable", async () => {
    await upsertUser(db, { tenantId: acme, email: "eng@acme.test", name: "Eng", role: "member" });
    await upsertUser(db, { tenantId: acme, email: "eng@acme.test", name: "Engineering", role: "owner" });
    const user = await findUserByEmail(db, acme, "eng@acme.test");
    expect(user).toMatchObject({ name: "Engineering", role: "owner" });
  });

  it("allows the same email in two tenants without collision", async () => {
    await upsertUser(db, { tenantId: acme, email: "same@x.test", name: "A", role: "member" });
    await upsertUser(db, { tenantId: globex, email: "same@x.test", name: "B", role: "member" });
    expect((await findUserByEmail(db, acme, "same@x.test"))?.name).toBe("A");
    expect((await findUserByEmail(db, globex, "same@x.test"))?.name).toBe("B");
  });
});

describe("audit log", () => {
  it("records who did what, scoped to the tenant", async () => {
    await recordAudit(db, { tenantId: acme, actor: "eng@acme.test", action: "scan.create", subject: "scan_1" });
    await recordAudit(db, { tenantId: globex, actor: "x@globex.test", action: "scan.create", subject: "scan_2" });
    const entries = await listAudit(db, acme);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ actor: "eng@acme.test", action: "scan.create" });
  });
});
