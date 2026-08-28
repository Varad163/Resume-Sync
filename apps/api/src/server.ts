/**
 * The REST API.
 *
 * Every route resolves a principal first and passes its tenantId into the
 * repositories, which are the only code that writes SQL. Mutating routes write
 * an audit entry. Nothing here formats a finding — the console and the report
 * do that from the same JSON a customer can fetch themselves.
 */

import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import {
  DEFAULT_SCAN_OPTIONS,
  type Finding,
  type MigrationPlan,
  type ScanOptions,
  type ScanTarget,
  generateCertificate,
  generateCertificateKeys,
  isPublished,
  computeWatchtowerDiff,
  validateMigrationPlanIntegrity,
} from "@ironbastion/core";
import type { CycloneDxBom } from "@ironbastion/cbom";
import {
  createProject,
  createScan,
  getArtefact,
  getProject,
  getScan,
  listAudit,
  listFindings,
  listProjects,
  listScans,
  recordAudit,
  scanNotes,
  scanPosture,
  type Database,
} from "@ironbastion/db";
import type { Queue } from "@ironbastion/runner";
import { AuthError, type Authenticator, type Principal } from "./auth.js";
import { renderHtmlReport } from "./report.js";

export interface ServerDeps {
  readonly db: Database;
  readonly queue: Queue;
  readonly auth: Authenticator;
  readonly version?: string;
}

declare module "fastify" {
  interface FastifyRequest {
    principal?: Principal;
  }
}

export async function createServer(deps: ServerDeps): Promise<FastifyInstance> {
  const app = Fastify({ logger: false, bodyLimit: 1_000_000 });

  const { privateKey, publicKey } = generateCertificateKeys();

  await app.register(cors, {
    origin: process.env["CORS_ORIGIN"]?.split(",") ?? true,
    credentials: true,
  });
  await app.register(rateLimit, { max: 300, timeWindow: "1 minute" });

  app.get("/health", async () => ({
    status: "ok",
    version: deps.version ?? "0.1.0",
    auth: deps.auth.mode,
    queue: deps.queue.id,
  }));

  app.get("/v1/certificate-public-key", async () => {
    return { publicKey };
  });

  // Everything below this hook requires a principal.
  app.addHook("preHandler", async (request, reply) => {
    if (
      request.url === "/health" ||
      request.url === "/v1/certificate-public-key" ||
      request.method === "OPTIONS"
    ) {
      return;
    }
    try {
      request.principal = await deps.auth.verify(request.headers.authorization);
    } catch (error) {
      const message = error instanceof AuthError ? error.message : "unauthorised";
      await reply.code(401).send({ error: "unauthorised", message });
    }
  });

  // ------------------------------------------------------------- projects
  app.get("/v1/projects", async (request) => {
    const principal = must(request);
    return { projects: await listProjects(deps.db, principal.tenantId) };
  });

  app.post("/v1/projects", async (request, reply) => {
    const principal = must(request);
    const body = request.body as { name?: string; description?: string; targets?: ScanTarget[] };
    if (!body?.name) return reply.code(400).send({ error: "name is required" });

    const project = await createProject(deps.db, {
      tenantId: principal.tenantId,
      name: body.name,
      description: body.description ?? "",
      targets: body.targets ?? [],
    });
    await recordAudit(deps.db, {
      tenantId: principal.tenantId,
      actor: principal.email,
      action: "project.create",
      subject: project.id,
    });
    return reply.code(201).send({ project });
  });

  app.get("/v1/projects/:id", async (request, reply) => {
    const principal = must(request);
    const { id } = request.params as { id: string };
    const project = await getProject(deps.db, principal.tenantId, id);
    if (!project) return reply.code(404).send({ error: "not found" });
    return { project };
  });

  app.get("/v1/projects/:id/watchtower", async (request, reply) => {
    const principal = must(request);
    const { id: projectId } = request.params as { id: string };

    const project = await getProject(deps.db, principal.tenantId, projectId);
    if (!project) return reply.code(404).send({ error: "project not found" });

    const scans = await listScans(deps.db, principal.tenantId, { projectId, limit: 10 });
    const successful = scans.filter((s) => s.status === "succeeded");

    if (successful.length < 2) {
      return { status: "insufficient-history" };
    }

    const currentScan = successful[0]!;
    const prevScan = successful[1]!;

    const [currentFindings, prevFindings] = await Promise.all([
      listFindings(deps.db, principal.tenantId, currentScan.id),
      listFindings(deps.db, principal.tenantId, prevScan.id),
    ]);

    const diff = computeWatchtowerDiff(
      prevFindings,
      currentFindings,
      prevScan.posture?.overall ?? 100,
      currentScan.posture?.overall ?? 100,
    );

    return diff;
  });

  // ---------------------------------------------------------------- scans
  app.post("/v1/scans", async (request, reply) => {
    const principal = must(request);
    const body = request.body as {
      projectId?: string;
      targets?: ScanTarget[];
      options?: Partial<ScanOptions>;
    };
    if (!body?.projectId) return reply.code(400).send({ error: "projectId is required" });

    const project = await getProject(deps.db, principal.tenantId, body.projectId);
    if (!project) return reply.code(404).send({ error: "project not found" });

    const targets = body.targets?.length ? body.targets : project.targets;
    if (targets.length === 0) {
      return reply.code(400).send({ error: "the project has no targets to scan" });
    }

    const scan = await createScan(deps.db, {
      tenantId: principal.tenantId,
      projectId: project.id,
      targets,
      options: { ...DEFAULT_SCAN_OPTIONS, ...body.options },
    });

    await deps.queue.enqueue({ scanId: scan.id, tenantId: principal.tenantId });
    await recordAudit(deps.db, {
      tenantId: principal.tenantId,
      actor: principal.email,
      action: "scan.create",
      subject: scan.id,
      detail: { projectId: project.id, targets: targets.length },
    });

    return reply.code(202).send({ scan });
  });

  app.get("/v1/scans", async (request) => {
    const principal = must(request);
    const { projectId, limit } = request.query as { projectId?: string; limit?: string };
    const scans = await listScans(deps.db, principal.tenantId, {
      ...(projectId ? { projectId } : {}),
      ...(limit ? { limit: Number.parseInt(limit, 10) } : {}),
    });
    return { scans };
  });

  app.get("/v1/scans/:id", async (request, reply) => {
    const principal = must(request);
    const { id } = request.params as { id: string };
    const scan = await getScan(deps.db, principal.tenantId, id);
    if (!scan) return reply.code(404).send({ error: "not found" });
    return {
      scan,
      posture: await scanPosture(deps.db, principal.tenantId, id),
      notes: await scanNotes(deps.db, principal.tenantId, id),
      inventory: await getArtefact(deps.db, principal.tenantId, id, "inventory"),
    };
  });

  app.get("/v1/scans/:id/findings", async (request, reply) => {
    const principal = must(request);
    const { id } = request.params as { id: string };
    const { severity, status, limit } = request.query as Record<string, string | undefined>;
    const scan = await getScan(deps.db, principal.tenantId, id);
    if (!scan) return reply.code(404).send({ error: "not found" });

    return {
      findings: await listFindings(deps.db, principal.tenantId, id, {
        ...(severity ? { severity } : {}),
        ...(status ? { status } : {}),
        ...(limit ? { limit: Number.parseInt(limit, 10) } : {}),
      }),
    };
  });

  app.get("/v1/scans/:id/cbom", async (request, reply) => {
    const principal = must(request);
    const { id } = request.params as { id: string };
    const cbom = await getArtefact<CycloneDxBom>(deps.db, principal.tenantId, id, "cbom");
    if (!cbom) return reply.code(404).send({ error: "no CBOM for this scan" });
    return reply
      .header("content-disposition", `attachment; filename="cbom-${id}.json"`)
      .send(cbom);
  });

  app.get("/v1/scans/:id/plan", async (request, reply) => {
    const principal = must(request);
    const { id } = request.params as { id: string };
    const [plan, customPlan] = await Promise.all([
      getArtefact<MigrationPlan>(deps.db, principal.tenantId, id, "plan"),
      getArtefact<MigrationPlan>(deps.db, principal.tenantId, id, "custom-plan"),
    ]);
    if (!plan) return reply.code(404).send({ error: "no plan for this scan" });
    return { plan, customPlan: customPlan ?? null };
  });

  app.post("/v1/scans/:id/plan/custom", async (request, reply) => {
    const principal = must(request);
    const { id } = request.params as { id: string };
    const body = request.body as { plan?: MigrationPlan };
    if (!body?.plan) return reply.code(400).send({ error: "custom plan is required" });

    // Validate existence of original plan
    const originalPlan = await getArtefact<MigrationPlan>(deps.db, principal.tenantId, id, "plan");
    if (!originalPlan) return reply.code(404).send({ error: "no original plan found for this scan" });

    // Validate integrity server-side
    const isValid = validateMigrationPlanIntegrity(originalPlan, body.plan);
    if (!isValid) return reply.code(400).send({ error: "custom plan integrity validation failed (unauthorized edits detected)" });

    // Store custom-plan artefact
    await deps.db.query(
      `INSERT INTO artefacts (scan_id, tenant_id, kind, document) VALUES ($1, $2, $3, $4)
       ON CONFLICT (scan_id, kind) DO UPDATE SET document = EXCLUDED.document`,
      [id, principal.tenantId, "custom-plan", JSON.stringify(body.plan)],
    );

    await recordAudit(deps.db, {
      tenantId: principal.tenantId,
      actor: principal.email,
      action: "plan.customize",
      subject: id,
    });

    return reply.code(200).send({ plan: body.plan });
  });

  app.delete("/v1/scans/:id/plan/custom", async (request, reply) => {
    const principal = must(request);
    const { id } = request.params as { id: string };

    await deps.db.query(
      `DELETE FROM artefacts WHERE scan_id = $1 AND tenant_id = $2 AND kind = $3`,
      [id, principal.tenantId, "custom-plan"],
    );

    await recordAudit(deps.db, {
      tenantId: principal.tenantId,
      actor: principal.email,
      action: "plan.reset",
      subject: id,
    });

    return reply.code(200).send({ status: "success" });
  });

  app.get("/v1/scans/:id/certificate", async (request, reply) => {
    const principal = must(request);
    const { id } = request.params as { id: string };
    const scan = await getScan(deps.db, principal.tenantId, id);
    if (!scan) return reply.code(404).send({ error: "scan not found" });

    const [cbom, posture, findings, project] = await Promise.all([
      getArtefact<CycloneDxBom>(deps.db, principal.tenantId, id, "cbom"),
      scanPosture(deps.db, principal.tenantId, id),
      listFindings(deps.db, principal.tenantId, id),
      getProject(deps.db, principal.tenantId, scan.projectId),
    ]);

    if (!cbom) return reply.code(400).send({ error: "no CBOM available for this scan" });

    const cert = generateCertificate({
      scanId: id,
      projectName: project?.name ?? scan.projectId,
      projectId: scan.projectId,
      overallPosture: posture?.overall ?? 100,
      severity: posture?.severity ?? "informational",
      cbomJson: JSON.stringify(cbom),
      findingsCount: findings.filter(isPublished).length,
      privateKeyPem: privateKey,
    });

    return cert;
  });

  /** The printable report. Browsers turn this into the PDF customers file. */
  app.get("/v1/scans/:id/report", async (request, reply) => {
    const principal = must(request);
    const { id } = request.params as { id: string };
    const scan = await getScan(deps.db, principal.tenantId, id);
    if (!scan) return reply.code(404).send({ error: "not found" });

    const [findings, cbom, plan, posture, notes, inventory, project] = await Promise.all([
      listFindings(deps.db, principal.tenantId, id),
      getArtefact<CycloneDxBom>(deps.db, principal.tenantId, id, "cbom"),
      getArtefact<MigrationPlan>(deps.db, principal.tenantId, id, "plan"),
      scanPosture(deps.db, principal.tenantId, id),
      scanNotes(deps.db, principal.tenantId, id),
      getArtefact<{ summary: string; observations: string[] }>(deps.db, principal.tenantId, id, "inventory"),
      getProject(deps.db, principal.tenantId, scan.projectId),
    ]);

    return reply.type("text/html").send(
      renderHtmlReport({
        scan,
        projectName: project?.name ?? scan.projectId,
        findings: findings as Finding[],
        ...(cbom ? { cbom } : {}),
        ...(plan ? { plan } : {}),
        ...(posture ? { posture } : {}),
        notes,
        ...(inventory ? { inventory } : {}),
      }),
    );
  });

  /** What every agent and collector did during this scan. */
  app.get("/v1/scans/:id/agents", async (request, reply) => {
    const principal = must(request);
    const { id } = request.params as { id: string };
    const scan = await getScan(deps.db, principal.tenantId, id);
    if (!scan) return reply.code(404).send({ error: "not found" });

    const [traces, collectorRuns] = await Promise.all([
      getArtefact<unknown[]>(deps.db, principal.tenantId, id, "agent-traces"),
      getArtefact<unknown[]>(deps.db, principal.tenantId, id, "collector-runs"),
    ]);

    return { traces: traces ?? [], collectorRuns: collectorRuns ?? [] };
  });

  // ---------------------------------------------------------------- audit
  app.get("/v1/audit", async (request) => {
    const principal = must(request);
    return { entries: await listAudit(deps.db, principal.tenantId) };
  });

  app.setErrorHandler(async (error: Error & { statusCode?: number }, _request, reply) => {
    const status = error.statusCode ?? 500;
    await reply.code(status).send({
      error: status === 500 ? "internal error" : error.message,
      ...(status === 500 ? {} : { message: error.message }),
    });
  });

  return app;
}

function must(request: FastifyRequest): Principal {
  if (!request.principal) throw new AuthError("unauthorised");
  return request.principal;
}
