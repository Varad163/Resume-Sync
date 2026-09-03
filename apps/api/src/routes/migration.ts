import type { FastifyInstance, FastifyRequest } from "fastify";
import { type MigrationPlan, validateMigrationPlanIntegrity } from "@ironbastion/core";
import {
  getArtefact,
  recordAudit,
  runInTenantTransaction,
  type Database,
} from "@ironbastion/db";
import { AuthError, type Principal } from "../auth.js";
import type { ServerDeps } from "../server.js";

function must(request: FastifyRequest): Principal {
  if (!request.principal) throw new AuthError("unauthorised");
  return request.principal;
}

export async function registerMigrationRoutes(app: FastifyInstance, deps: ServerDeps): Promise<void> {
  const runTx = <T>(request: FastifyRequest, fn: (tx: Database) => Promise<T>): Promise<T> => {
    const principal = must(request);
    return runInTenantTransaction(deps.db, principal.tenantId, fn);
  };

  app.get("/v1/scans/:id/plan", async (request, reply) => {
    return runTx(request, async (tx) => {
      const principal = must(request);
      const { id } = request.params as { id: string };
      const [plan, customPlan] = await Promise.all([
        getArtefact<MigrationPlan>(tx, principal.tenantId, id, "plan"),
        getArtefact<MigrationPlan>(tx, principal.tenantId, id, "custom-plan"),
      ]);
      if (!plan) return reply.code(404).send({ error: "no plan for this scan" });
      return { plan, customPlan: customPlan ?? null };
    });
  });

  app.post("/v1/scans/:id/plan/custom", async (request, reply) => {
    const principal = must(request);
    const { id } = request.params as { id: string };
    const body = request.body as { plan?: MigrationPlan };
    if (!body?.plan) return reply.code(400).send({ error: "custom plan is required" });

    return runTx(request, async (tx) => {
      const originalPlan = await getArtefact<MigrationPlan>(tx, principal.tenantId, id, "plan");
      if (!originalPlan) return reply.code(404).send({ error: "no original plan found for this scan" });

      const isValid = validateMigrationPlanIntegrity(originalPlan, body.plan!);
      if (!isValid) return reply.code(400).send({ error: "custom plan integrity validation failed (unauthorized edits detected)" });

      await tx.query(
        `INSERT INTO artefacts (scan_id, tenant_id, kind, document) VALUES ($1, $2, $3, $4)
         ON CONFLICT (scan_id, kind) DO UPDATE SET document = EXCLUDED.document`,
        [id, principal.tenantId, "custom-plan", JSON.stringify(body.plan)],
      );

      await recordAudit(tx, {
        tenantId: principal.tenantId,
        actor: principal.email,
        action: "plan.customize",
        subject: id,
      });

      return reply.code(200).send({ plan: body.plan });
    });
  });

  app.delete("/v1/scans/:id/plan/custom", async (request, reply) => {
    const principal = must(request);
    const { id } = request.params as { id: string };

    return runTx(request, async (tx) => {
      await tx.query(
        `DELETE FROM artefacts WHERE scan_id = $1 AND tenant_id = $2 AND kind = $3`,
        [id, principal.tenantId, "custom-plan"],
      );

      await recordAudit(tx, {
        tenantId: principal.tenantId,
        actor: principal.email,
        action: "plan.reset",
        subject: id,
      });

      return reply.code(200).send({ status: "success" });
    });
  });
}
