import type { FastifyInstance, FastifyRequest } from "fastify";
import type { CycloneDxBom } from "@ironbastion/cbom";
import { generateCertificate, isPublished } from "@ironbastion/core";
import {
  getArtefact,
  getProject,
  getScan,
  listFindings,
  runInTenantTransaction,
  scanPosture,
  type Database,
} from "@ironbastion/db";
import { AuthError, type Principal } from "../auth.js";
import type { ServerDeps } from "../server.js";

function must(request: FastifyRequest): Principal {
  if (!request.principal) throw new AuthError("unauthorised");
  return request.principal;
}

export async function registerCertifyRoutes(
  app: FastifyInstance,
  deps: ServerDeps,
  privateKey: string,
): Promise<void> {
  const runTx = <T>(request: FastifyRequest, fn: (tx: Database) => Promise<T>): Promise<T> => {
    const principal = must(request);
    return runInTenantTransaction(deps.db, principal.tenantId, fn);
  };

  app.get("/v1/scans/:id/certificate", async (request, reply) => {
    return runTx(request, async (tx) => {
      const principal = must(request);
      const { id } = request.params as { id: string };
      const scan = await getScan(tx, principal.tenantId, id);
      if (!scan) return reply.code(404).send({ error: "scan not found" });

      const [cbom, posture, findings, project] = await Promise.all([
        getArtefact<CycloneDxBom>(tx, principal.tenantId, id, "cbom"),
        scanPosture(tx, principal.tenantId, id),
        listFindings(tx, principal.tenantId, id),
        getProject(tx, principal.tenantId, scan.projectId),
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
  });
}
