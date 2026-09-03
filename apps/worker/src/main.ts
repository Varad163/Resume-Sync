/**
 * The scan worker.
 *
 * Long-polls the queue, runs one campaign at a time, and acknowledges only
 * after the scan is recorded. A task that dies mid-scan leaves the message
 * invisible until the visibility timeout expires, at which point another worker
 * picks it up — so a crashed worker costs time, not a lost scan.
 */

import {
  createDatabase,
  migrate,
  createScan,
  listScans,
  recordAudit,
  listActiveMonitoredProjects,
  updateProjectLastMonitored,
  type Database,
} from "@ironbastion/db";
import { createQueue, executeScan, resolveRemoteHead, type Queue } from "@ironbastion/runner";
import { DEFAULT_SCAN_OPTIONS, type GitRepositoryTarget } from "@ironbastion/core";
import {
  configuredProvider,
  createAwsClient,
  createDirectClient,
  createSimulatedClient,
  type ModelClient,
} from "@ironbastion/agents";

let shuttingDown = false;

async function startMonitoringPoller(db: Database, queue: Queue): Promise<void> {
  log("starting background monitoring poller");
  while (!shuttingDown) {
    try {
      const activeProjects = await listActiveMonitoredProjects(db);
      for (const project of activeProjects) {
        if (shuttingDown) break;

        const lastChecked = project.lastMonitoredAt ? new Date(project.lastMonitoredAt).getTime() : 0;
        const elapsedMinutes = (Date.now() - lastChecked) / 60000;

        if (elapsedMinutes < project.monitoringInterval) {
          continue;
        }

        const gitTargets = (project.targets || []).filter(
          (t) => t.kind === "git-repository" && (t.remoteUrl || t.localPath),
        ) as GitRepositoryTarget[];
        if (gitTargets.length === 0) {
          continue;
        }

        try {
          const firstTarget = gitTargets[0]!;
          const targetUrl = firstTarget.remoteUrl ?? firstTarget.localPath;
          log(`checking remote head for project: ${project.name} (${targetUrl})`);

          const remoteSha = await resolveRemoteHead({
            remoteUrl: firstTarget.remoteUrl,
            localPath: firstTarget.localPath,
            ref: firstTarget.ref,
          });

          const scans = await listScans(db, project.tenantId, { projectId: project.id, limit: 10 });
          const latestScan = scans.find((s) => s.status === "succeeded");

          let shouldRescan = true;
          if (latestScan) {
            const latestTarget = latestScan.targets.find((t) => t.id === firstTarget.id);
            const latestSha = (latestTarget as { commitHash?: string } | undefined)?.commitHash;

            if (latestSha === remoteSha) {
              shouldRescan = false;
            }
          }

          const activeScan = scans.find((s) => (s.status as string) === "running" || s.status === "queued");
          if (activeScan) {
            const activeTarget = activeScan.targets.find((t) => t.id === firstTarget.id);
            const activeSha = (activeTarget as { commitHash?: string } | undefined)?.commitHash;
            if (activeSha === remoteSha) {
              shouldRescan = false;
            }
          }

          if (shouldRescan) {
            log(`changes detected for project: ${project.name} (${remoteSha.slice(0, 7)}). queueing scan...`);
            const scan = await createScan(db, {
              tenantId: project.tenantId,
              projectId: project.id,
              targets: project.targets,
              options: DEFAULT_SCAN_OPTIONS,
            });

            await queue.enqueue({ scanId: scan.id, tenantId: project.tenantId });
            await recordAudit(db, {
              tenantId: project.tenantId,
              actor: "system-monitor",
              action: "scan.trigger_monitor",
              subject: scan.id,
              detail: { projectId: project.id, commitHash: remoteSha },
            });
          } else {
            log(`project ${project.name} is up-to-date at commit: ${remoteSha.slice(0, 7)}`);
          }

          await updateProjectLastMonitored(db, project.id);
        } catch (err) {
          log(`error checking project ${project.name}: ${(err as Error).message}`);
          await updateProjectLastMonitored(db, project.id).catch(() => {});
        }
      }
    } catch (e) {
      log(`poller cycle error: ${(e as Error).message}`);
    }

    await sleep(2000);
  }
  log("background monitoring poller stopped");
}

async function main(): Promise<void> {
  const db = await createDatabase();
  await migrate(db);

  const queue = await createQueue();
  const client = await modelClient();

  log(`worker up: queue ${queue.id}, model ${client?.id ?? "rule-based fallback"}`);

  void startMonitoringPoller(db, queue);

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      log(`${signal} received; finishing the current scan then stopping`);
      shuttingDown = true;
    });
  }

  while (!shuttingDown) {
    let received: Awaited<ReturnType<typeof queue.receive>>;
    try {
      received = await queue.receive(1);
    } catch (error) {
      log(`receive failed: ${(error as Error).message}`);
      await sleep(5000);
      continue;
    }

    if (received.length === 0) {
      if (queue.id === "in-process") await sleep(1000);
      continue;
    }

    for (const { message, ack } of received) {
      log(`starting ${message.scanId}`);
      await executeScan({ db, scanId: message.scanId, client, log });
      await ack();
    }
  }

  await queue.close();
  await db.close();
  log("worker stopped");
}

async function modelClient(): Promise<ModelClient | null> {
  const provider = configuredProvider();
  try {
    if (provider === "aws") return await createAwsClient();
    if (provider === "anthropic") return await createDirectClient();
    if (provider === "simulated") return createSimulatedClient();
  } catch (error) {
    log(`model client unavailable: ${(error as Error).message}`);
  }
  return null;
}

function log(message: string): void {
  process.stdout.write(`${new Date().toISOString()} ${message}\n`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error: unknown) => {
  process.stderr.write(`worker: ${(error as Error).stack ?? String(error)}\n`);
  process.exit(1);
});
