import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ForgeVerificationReport } from "@ironbastion/core";
import {
  getArtefact,
  getScan,
  recordAudit,
  runInTenantTransaction,
  saveArtefact,
  type Database,
} from "@ironbastion/db";
import { runForgeVerification } from "@ironbastion/runner";
import { AuthError, type Principal } from "../auth.js";
import type { ServerDeps } from "../server.js";

function must(request: FastifyRequest): Principal {
  if (!request.principal) throw new AuthError("unauthorised");
  return request.principal;
}

export async function registerForgeRoutes(app: FastifyInstance, deps: ServerDeps): Promise<void> {
  const runTx = <T>(request: FastifyRequest, fn: (tx: Database) => Promise<T>): Promise<T> => {
    const principal = must(request);
    return runInTenantTransaction(deps.db, principal.tenantId, fn);
  };

  app.get("/v1/scans/:id/forge", async (request, reply) => {
    return runTx(request, async (tx) => {
      const principal = must(request);
      const { id: scanId } = request.params as { id: string };

      const scan = await getScan(tx, principal.tenantId, scanId);
      if (!scan) return reply.code(404).send({ error: "scan not found" });

      const report = await getArtefact<ForgeVerificationReport>(tx, principal.tenantId, scanId, "forge");
      return { report: report ?? null };
    });
  });

  app.post("/v1/scans/:id/forge/results", async (request, reply) => {
    const principal = must(request);
    const { id: scanId } = request.params as { id: string };
    const body = request.body as { report?: ForgeVerificationReport };
    if (!body?.report) return reply.code(400).send({ error: "verification report is required" });

    return runTx(request, async (tx) => {
      const scan = await getScan(tx, principal.tenantId, scanId);
      if (!scan) return reply.code(404).send({ error: "scan not found" });

      await saveArtefact(tx, principal.tenantId, scanId, "forge", body.report!);

      await recordAudit(tx, {
        tenantId: principal.tenantId,
        actor: principal.email,
        action: "scan.forge_results",
        subject: scanId,
        detail: { overallStatus: body.report!.overallStatus },
      });

      return { status: "success", report: body.report };
    });
  });

  app.post("/v1/scans/:id/forge/check", async (request, reply) => {
    const principal = must(request);
    const { id: scanId } = request.params as { id: string };

    const scan = await runTx(request, (tx) => getScan(tx, principal.tenantId, scanId));
    if (!scan) return reply.code(404).send({ error: "scan not found" });

    const tlsTargets = (scan.targets || []).filter((t) => t.kind === "tls-endpoint");
    if (tlsTargets.length === 0) {
      return reply.code(400).send({ error: "scan has no TLS endpoint targets to validate" });
    }

    const target = tlsTargets[0]!;
    const report = await runForgeVerification(scanId, target);

    return runTx(request, async (tx) => {
      await saveArtefact(tx, principal.tenantId, scanId, "forge", report);

      await recordAudit(tx, {
        tenantId: principal.tenantId,
        actor: principal.email,
        action: "scan.forge_validate",
        subject: scanId,
        detail: { overallStatus: report.overallStatus },
      });

      return { report };
    });
  });
}
