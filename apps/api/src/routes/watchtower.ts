import type { FastifyInstance, FastifyRequest } from "fastify";
import { computeWatchtowerDiff, DEFAULT_SCAN_OPTIONS } from "@ironbastion/core";
import {
  createScan,
  getProject,
  listFindings,
  listScans,
  recordAudit,
  runInTenantTransaction,
  type Database,
} from "@ironbastion/db";
import { resolveRemoteHead } from "@ironbastion/runner";
import { AuthError, type Principal } from "../auth.js";
import type { ServerDeps } from "../server.js";

function must(request: FastifyRequest): Principal {
  if (!request.principal) throw new AuthError("unauthorised");
  return request.principal;
}

export async function registerWatchtowerRoutes(app: FastifyInstance, deps: ServerDeps): Promise<void> {
  const runTx = <T>(request: FastifyRequest, fn: (tx: Database) => Promise<T>): Promise<T> => {
    const principal = must(request);
    return runInTenantTransaction(deps.db, principal.tenantId, fn);
  };

  app.get("/v1/projects/:id/watchtower", async (request, reply) => {
    return runTx(request, async (tx) => {
      const principal = must(request);
      const { id: projectId } = request.params as { id: string };

      const project = await getProject(tx, principal.tenantId, projectId);
      if (!project) return reply.code(404).send({ error: "project not found" });

      const scans = await listScans(tx, principal.tenantId, { projectId, limit: 10 });
      const successful = scans.filter((s) => s.status === "succeeded");

      if (successful.length < 2) {
        return {
          status: "insufficient-history",
          history: scans.map((s) => ({
            id: s.id,
            status: s.status,
            startedAt: s.startedAt,
            finishedAt: s.finishedAt,
            postureScore: s.posture?.overall ?? null,
            targets: s.targets,
          })),
        };
      }

      const currentScan = successful[0]!;
      const prevScan = successful[1]!;

      const [currentFindings, prevFindings] = await Promise.all([
        listFindings(tx, principal.tenantId, currentScan.id),
        listFindings(tx, principal.tenantId, prevScan.id),
      ]);

      const diff = computeWatchtowerDiff(
        prevFindings,
        currentFindings,
        prevScan.posture?.overall ?? 100,
        currentScan.posture?.overall ?? 100,
      );

      return {
        ...diff,
        history: scans.map((s) => ({
          id: s.id,
          status: s.status,
          startedAt: s.startedAt,
          finishedAt: s.finishedAt,
          postureScore: s.posture?.overall ?? null,
          targets: s.targets,
        })),
      };
    });
  });

  app.post("/v1/projects/:id/monitor", async (request, reply) => {
    const principal = must(request);
    const { id: projectId } = request.params as { id: string };

    const project = await runTx(request, (tx) => getProject(tx, principal.tenantId, projectId));
    if (!project) return reply.code(404).send({ error: "project not found" });

    const gitTargets = (project.targets || []).filter((t) => t.kind === "git-repository");
    if (gitTargets.length === 0) {
      return { status: "no-git-targets" };
    }

    let remoteSha: string;
    const firstTarget = gitTargets[0]!;
    try {
      remoteSha = await resolveRemoteHead({
        remoteUrl: firstTarget.remoteUrl!,
        ref: firstTarget.ref,
      });
    } catch {
      return reply.code(400).send({
        error: "failed to check remote repository",
        detail: "ls-remote access check failed or timed out",
      });
    }

    return runTx(request, async (tx) => {
      const scans = await listScans(tx, principal.tenantId, { projectId, limit: 10 });
      const latestScan = scans.find((s) => s.status === "succeeded");

      if (latestScan) {
        const latestTarget = latestScan.targets.find((t) => t.id === firstTarget.id);
        const latestSha = (latestTarget as { commitHash?: string } | undefined)?.commitHash;

        if (latestSha === remoteSha) {
          return {
            status: "up-to-date",
            commitHash: remoteSha,
          };
        }
      }

      const scan = await createScan(tx, {
        tenantId: principal.tenantId,
        projectId: project.id,
        targets: project.targets,
        options: DEFAULT_SCAN_OPTIONS,
      });

      await deps.queue.enqueue({ scanId: scan.id, tenantId: principal.tenantId });
      await recordAudit(tx, {
        tenantId: principal.tenantId,
        actor: principal.email,
        action: "scan.trigger_monitor",
        subject: scan.id,
        detail: { projectId: project.id, commitHash: remoteSha },
      });

      return reply.code(202).send({
        status: "scan-queued",
        scan,
        commitHash: remoteSha,
      });
    });
  });
}
