import type { FastifyInstance, FastifyRequest } from "fastify";
import { listAudit, runInTenantTransaction, type Database } from "@ironbastion/db";
import { AuthError, type Principal } from "../auth.js";
import type { ServerDeps } from "../server.js";

function must(request: FastifyRequest): Principal {
  if (!request.principal) throw new AuthError("unauthorised");
  return request.principal;
}

export async function registerAuditRoutes(app: FastifyInstance, deps: ServerDeps): Promise<void> {
  const runTx = <T>(request: FastifyRequest, fn: (tx: Database) => Promise<T>): Promise<T> => {
    const principal = must(request);
    return runInTenantTransaction(deps.db, principal.tenantId, fn);
  };

  app.get("/v1/audit", async (request) => {
    return runTx(request, async (tx) => {
      const principal = must(request);
      return { entries: await listAudit(tx, principal.tenantId) };
    });
  });
}
