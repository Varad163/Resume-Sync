import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ScanTarget } from "@ironbastion/core";
import {
  createProject,
  getProject,
  listProjects,
  recordAudit,
  runInTenantTransaction,
  updateProject,
  updateProjectMonitoring,
  type Database,
} from "@ironbastion/db";
import { AuthError, type Principal } from "../auth.js";
import type { ServerDeps } from "../server.js";

function must(request: FastifyRequest): Principal {
  if (!request.principal) throw new AuthError("unauthorised");
  return request.principal;
}

export async function registerProjectRoutes(app: FastifyInstance, deps: ServerDeps): Promise<void> {
  const runTx = <T>(request: FastifyRequest, fn: (tx: Database) => Promise<T>): Promise<T> => {
    const principal = must(request);
    return runInTenantTransaction(deps.db, principal.tenantId, fn);
  };

  app.get("/v1/projects", async (request) => {
    return runTx(request, async (tx) => {
      const principal = must(request);
      return { projects: await listProjects(tx, principal.tenantId) };
    });
  });

  app.post("/v1/projects", async (request, reply) => {
    const principal = must(request);
    const body = request.body as { name?: string; description?: string; targets?: ScanTarget[] };
    if (!body?.name) return reply.code(400).send({ error: "name is required" });

    return runTx(request, async (tx) => {
      const project = await createProject(tx, {
        tenantId: principal.tenantId,
        name: body.name!,
        description: body.description ?? "",
        targets: body.targets ?? [],
      });
      await recordAudit(tx, {
        tenantId: principal.tenantId,
        actor: principal.email,
        action: "project.create",
        subject: project.id,
      });
      return reply.code(201).send({ project });
    });
  });

  app.get("/v1/projects/:id", async (request, reply) => {
    return runTx(request, async (tx) => {
      const principal = must(request);
      const { id } = request.params as { id: string };
      const project = await getProject(tx, principal.tenantId, id);
      if (!project) return reply.code(404).send({ error: "project not found" });
      return { project };
    });
  });

  app.put("/v1/projects/:id", async (request, reply) => {
    const principal = must(request);
    const { id } = request.params as { id: string };
    const body = request.body as { name?: string; description?: string; targets?: ScanTarget[] };

    return runTx(request, async (tx) => {
      const updated = await updateProject(tx, principal.tenantId, id, {
        name: body?.name,
        description: body?.description,
        targets: body?.targets,
      });

      if (!updated) return reply.code(404).send({ error: "project not found" });

      await recordAudit(tx, {
        tenantId: principal.tenantId,
        actor: principal.email,
        action: "project.update",
        subject: id,
        detail: { name: body?.name, targetCount: body?.targets?.length },
      });

      return { project: updated };
    });
  });

  app.post("/v1/projects/:id/monitoring", async (request, reply) => {
    const principal = must(request);
    const { id: projectId } = request.params as { id: string };
    const body = request.body as { enabled?: boolean; interval?: number };

    if (body?.enabled === undefined || !body?.interval) {
      return reply.code(400).send({ error: "enabled and interval are required" });
    }

    return runTx(request, async (tx) => {
      const project = await getProject(tx, principal.tenantId, projectId);
      if (!project) return reply.code(404).send({ error: "project not found" });

      await updateProjectMonitoring(tx, principal.tenantId, projectId, body.enabled!, body.interval!);
      await recordAudit(tx, {
        tenantId: principal.tenantId,
        actor: principal.email,
        action: "project.monitoring_update",
        subject: projectId,
        detail: { enabled: body.enabled, interval: body.interval },
      });

      return { success: true };
    });
  });
}
