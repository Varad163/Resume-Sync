import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import path from "node:path";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import type { CycloneDxBom } from "@ironbastion/cbom";
import {
  DEFAULT_SCAN_OPTIONS,
  newId,
  type ScanOptions,
  type ScanTarget,
} from "@ironbastion/core";
import {
  createScan,
  getArtefact,
  getProject,
  getScan,
  listFindings,
  listScans,
  recordAudit,
  runInTenantTransaction,
  scanNotes,
  scanPosture,
  type Database,
} from "@ironbastion/db";
import {
  extractZipSafely,
  isValidZipHeader,
  MAX_ZIP_UPLOAD_BYTES,
  removeUploadZip,
  storeUploadZip,
} from "@ironbastion/runner";
import { AuthError, type Principal } from "../auth.js";
import { renderHtmlReport } from "../report.js";
import type { ServerDeps } from "../server.js";

function must(request: FastifyRequest): Principal {
  if (!request.principal) throw new AuthError("unauthorised");
  return request.principal;
}

export async function registerScanRoutes(app: FastifyInstance, deps: ServerDeps): Promise<void> {
  const runTx = <T>(request: FastifyRequest, fn: (tx: Database) => Promise<T>): Promise<T> => {
    const principal = must(request);
    return runInTenantTransaction(deps.db, principal.tenantId, fn);
  };

  app.post("/v1/scans", async (request, reply) => {
    const principal = must(request);
    const body = request.body as {
      projectId?: string;
      targets?: ScanTarget[];
      options?: Partial<ScanOptions>;
    };
    if (!body?.projectId) return reply.code(400).send({ error: "projectId is required" });

    const project = await runTx(request, (tx) => getProject(tx, principal.tenantId, body.projectId!));
    if (!project) return reply.code(404).send({ error: "project not found" });

    const targets = body.targets?.length ? body.targets : project.targets;
    if (targets.length === 0) {
      return reply.code(400).send({ error: "the project has no targets to scan" });
    }

    return runTx(request, async (tx) => {
      const scan = await createScan(tx, {
        tenantId: principal.tenantId,
        projectId: project.id,
        targets,
        options: { ...DEFAULT_SCAN_OPTIONS, ...body.options },
      });

      await deps.queue.enqueue({ scanId: scan.id, tenantId: principal.tenantId });
      await recordAudit(tx, {
        tenantId: principal.tenantId,
        actor: principal.email,
        action: "scan.create",
        subject: scan.id,
        detail: { projectId: project.id, targets: targets.length },
      });

      return reply.code(202).send({ scan });
    });
  });

  const handleZipUpload = async (request: FastifyRequest, reply: FastifyReply, paramProjectId?: string) => {
    const principal = must(request);

    if (paramProjectId) {
      const project = await runTx(request, (tx) => getProject(tx, principal.tenantId, paramProjectId));
      if (!project) return reply.code(404).send({ error: "project not found" });
    }

    let data;
    try {
      data = await request.file();
    } catch {
      return reply.code(400).send({ error: "failed to process multipart upload" });
    }

    if (!data) return reply.code(400).send({ error: "zip file is required" });

    const formProjectId = (data.fields["projectId"] as { value?: string } | undefined)?.value;
    const projectId = paramProjectId ?? formProjectId;
    if (!projectId) return reply.code(400).send({ error: "projectId is required" });

    const project = await runTx(request, (tx) => getProject(tx, principal.tenantId, projectId));
    if (!project) return reply.code(404).send({ error: "project not found" });

    const filename = data.filename || "upload.zip";
    if (!filename.toLowerCase().endsWith(".zip")) {
      return reply.code(400).send({ error: "only .zip files are supported" });
    }

    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of data.file) {
      const buf = chunk as Buffer;
      size += buf.length;
      if (size > MAX_ZIP_UPLOAD_BYTES) {
        return reply.code(400).send({ error: "ZIP file exceeds maximum upload size (50MB)" });
      }
      chunks.push(buf);
    }

    const buffer = Buffer.concat(chunks);

    if (!isValidZipHeader(buffer)) {
      return reply.code(400).send({ error: "invalid ZIP archive" });
    }

    const scanId = newId("scan");
    const zipKey = await storeUploadZip(principal.tenantId, scanId, buffer);

    const tempTestDir = path.join(tmpdir(), `ironbastion-test-${scanId}`);
    try {
      await extractZipSafely(zipKey, tempTestDir);
    } catch (err) {
      await removeUploadZip(principal.tenantId, scanId);
      return reply.code(400).send({
        error: "ZIP archive security validation failed",
        detail: (err as Error).message,
      });
    } finally {
      await rm(tempTestDir, { recursive: true, force: true }).catch(() => {});
    }

    const targets: ScanTarget[] = [
      {
        kind: "zip-archive",
        id: newId("target"),
        name: filename,
        zipKey,
        zipFilename: filename,
      },
    ];

    return runTx(request, async (tx) => {
      const scan = await createScan(tx, {
        tenantId: principal.tenantId,
        projectId: project.id,
        targets,
        options: DEFAULT_SCAN_OPTIONS,
      });

      await deps.queue.enqueue({ scanId: scan.id, tenantId: principal.tenantId });
      await recordAudit(tx, {
        tenantId: principal.tenantId,
        actor: principal.email,
        action: "scan.upload",
        subject: scan.id,
        detail: { projectId: project.id, filename, size },
      });

      return reply.code(202).send({ scan });
    });
  };

  app.post("/v1/scans/upload", async (request, reply) => handleZipUpload(request, reply));
  app.post("/v1/projects/:projectId/scans/upload", async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    return handleZipUpload(request, reply, projectId);
  });

  app.get("/v1/scans", async (request) => {
    return runTx(request, async (tx) => {
      const principal = must(request);
      const { projectId, limit } = request.query as { projectId?: string; limit?: string };
      const scans = await listScans(tx, principal.tenantId, {
        ...(projectId ? { projectId } : {}),
        ...(limit ? { limit: Number.parseInt(limit, 10) } : {}),
      });
      return { scans };
    });
  });

  app.get("/v1/scans/:id", async (request, reply) => {
    return runTx(request, async (tx) => {
      const principal = must(request);
      const { id } = request.params as { id: string };
      const scan = await getScan(tx, principal.tenantId, id);
      if (!scan) return reply.code(404).send({ error: "not found" });
      return {
        scan,
        posture: await scanPosture(tx, principal.tenantId, id),
        notes: await scanNotes(tx, principal.tenantId, id),
        inventory: await getArtefact(tx, principal.tenantId, id, "inventory"),
      };
    });
  });

  app.get("/v1/scans/:id/findings", async (request, reply) => {
    return runTx(request, async (tx) => {
      const principal = must(request);
      const { id } = request.params as { id: string };
      const { severity, status, limit } = request.query as Record<string, string | undefined>;
      const scan = await getScan(tx, principal.tenantId, id);
      if (!scan) return reply.code(404).send({ error: "not found" });

      return {
        findings: await listFindings(tx, principal.tenantId, id, {
          ...(severity ? { severity } : {}),
          ...(status ? { status } : {}),
          ...(limit ? { limit: Number.parseInt(limit, 10) } : {}),
        }),
      };
    });
  });

  app.get("/v1/scans/:id/cbom", async (request, reply) => {
    return runTx(request, async (tx) => {
      const principal = must(request);
      const { id } = request.params as { id: string };
      const cbom = await getArtefact<CycloneDxBom>(tx, principal.tenantId, id, "cbom");
      if (!cbom) return reply.code(404).send({ error: "no CBOM for this scan" });
      return reply
        .header("content-disposition", `attachment; filename="cbom-${id}.json"`)
        .send(cbom);
    });
  });

  app.get("/v1/scans/:id/agents", async (request, reply) => {
    return runTx(request, async (tx) => {
      const principal = must(request);
      const { id } = request.params as { id: string };
      const scan = await getScan(tx, principal.tenantId, id);
      if (!scan) return reply.code(404).send({ error: "not found" });

      const [traces, collectorRuns] = await Promise.all([
        getArtefact<unknown[]>(tx, principal.tenantId, id, "agent-traces"),
        getArtefact<unknown[]>(tx, principal.tenantId, id, "collector-runs"),
      ]);
      return { traces: traces ?? [], collectorRuns: collectorRuns ?? [] };
    });
  });

  app.get("/v1/scans/:id/report", async (request, reply) => {
    const { id } = request.params as { id: string };
    const principal = must(request);
    const scan = await runTx(request, (tx) => getScan(tx, principal.tenantId, id));
    if (!scan) return reply.code(404).send({ error: "not found" });

    const [posture, findings, cbom, project, notes] = await runTx(request, async (tx) => {
      return Promise.all([
        scanPosture(tx, principal.tenantId, id),
        listFindings(tx, principal.tenantId, id),
        getArtefact<CycloneDxBom>(tx, principal.tenantId, id, "cbom"),
        getProject(tx, principal.tenantId, scan.projectId),
        scanNotes(tx, principal.tenantId, id),
      ]);
    });

    const html = renderHtmlReport({
      scan,
      projectName: project?.name ?? scan.projectId,
      posture,
      findings: findings ?? [],
      notes: notes ?? [],
      ...(cbom ? { cbom } : {}),
    });

    return reply.type("text/html; charset=utf-8").send(html);
  });
}
