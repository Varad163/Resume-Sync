/**
 * Executing one scan, from queued row to stored artefacts.
 *
 * This is the only place that knows how a scan actually happens, so the API's
 * inline mode and the Fargate worker cannot drift apart. Failures are recorded
 * on the scan row rather than thrown away: a customer who triggers a scan is
 * entitled to know why it did not finish.
 */

import path from "node:path";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import {
  completeScan,
  failScan,
  getGithubInstallation,
  getScanUnscoped,
  recordAudit,
  updateScanPhase,
  type Database,
} from "@ironbastion/db";
import {
  getGithubAppConfigFromEnv,
  getInstallationAccessToken,
  type ScanRecord,
  type ScanTarget,
} from "@ironbastion/core";
import { runCampaign, type CampaignResult, type ModelClient } from "@ironbastion/agents";
import { checkout, redact, resolveLocalCommit, type CheckoutResult } from "./checkout.js";
import { extractZipSafely, getUploadZipPath } from "./zip.js";

export interface ExecuteOptions {
  readonly db: Database;
  readonly scanId: string;
  readonly client: ModelClient | null;
  readonly projectName?: string;
  /** Token minted per scan for private clones. */
  readonly gitToken?: string;
  readonly log?: (message: string) => void;
}

export async function executeScan(options: ExecuteOptions): Promise<CampaignResult | undefined> {
  const { db, scanId } = options;
  const log = options.log ?? (() => {});

  const scan = await getScanUnscoped(db, scanId);
  if (!scan) {
    log(`scan ${scanId} not found`);
    return undefined;
  }

  const checkouts: CheckoutResult[] = [];
  const tempDirsToClean: string[] = [];
  const zipKeysToClean: string[] = [];

  try {
    await updateScanPhase(db, scanId, "DISCOVER", "running");

    const targets: ScanTarget[] = [];
    for (const target of scan.targets) {
      if (target.kind === "git-repository" && !target.localPath && target.remoteUrl) {
        log(`cloning ${redact(target.remoteUrl)}`);
        let token = options.gitToken;
        if (!token && (target.provider === "github" || target.remoteUrl.includes("github.com"))) {
          try {
            const config = getGithubAppConfigFromEnv();
            if (config) {
              const installation = await getGithubInstallation(db, scan.tenantId);
              if (installation) {
                const tokenData = await getInstallationAccessToken(config, installation.githubInstallationId);
                token = tokenData.token;
              }
            }
          } catch (e) {
            log(`Warning: failed to resolve GitHub token: ${(e as Error).message}`);
          }
        }

        const result = await checkout({
          remoteUrl: target.remoteUrl,
          ...(target.ref ? { ref: target.ref } : {}),
          ...(token ? { token } : {}),
        });
        checkouts.push(result);
        
        let commitHash: string | undefined;
        let commitMessage: string | undefined;
        try {
          const info = await resolveLocalCommit(result.path);
          commitHash = info.sha;
          commitMessage = info.message;
        } catch (e) {
          log(`Warning: failed to resolve commit info: ${(e as Error).message}`);
        }

        targets.push({
          ...target,
          localPath: result.path,
          ...(commitHash ? { commitHash } : {}),
          ...(commitMessage ? { commitMessage } : {}),
        });
      } else if (target.kind === "zip-archive") {
        const zipPath = target.zipKey ?? getUploadZipPath(scan.tenantId, scanId);
        log(`extracting ZIP archive: ${target.name} (${zipPath})`);
        const extractDir = path.join(tmpdir(), `ironbastion-zip-${scanId}`, "src");
        await extractZipSafely(zipPath, extractDir);
        tempDirsToClean.push(path.join(tmpdir(), `ironbastion-zip-${scanId}`));
        zipKeysToClean.push(zipPath);

        targets.push({
          ...target,
          localPath: extractDir,
        });
      } else {
        targets.push(target);
      }
    }

    const prepared: ScanRecord = { ...scan, targets };
    const result = await runCampaign({
      scan: prepared,
      client: options.client,
      projectName: options.projectName ?? nameOf(targets) ?? scan.projectId,
      log,
      onPhase: (phase) => {
        void updateScanPhase(db, scanId, phase, phase === "DONE" ? "succeeded" : "running");
      },
    });

    await completeScan(db, {
      scanId,
      tenantId: scan.tenantId,
      stats: result.scan.stats,
      notes: result.notes,
      posture: result.posture,
      findings: result.findings,
      cbom: result.cbom,
      plan: result.plan,
      inventory: result.inventory,
      traces: result.traces,
      collectorRuns: result.collectorRuns,
    });

    await recordAudit(db, {
      tenantId: scan.tenantId,
      actor: "system:worker",
      action: "scan.complete",
      subject: scanId,
      detail: {
        findings: result.findings.length,
        needsHuman: result.needsHuman.length,
        costCents: result.scan.stats.costCents,
        modelJudged: result.modelJudged,
        ruleJudged: result.ruleJudged,
        agents: result.traces.map((trace) => `${trace.agentId}:${trace.model}`),
      },
    });

    log(`scan ${scanId} complete: ${result.findings.length} findings`);
    return result;
  } catch (error) {
    const message = redact((error as Error).message ?? String(error));
    await failScan(db, scanId, message);
    await recordAudit(db, {
      tenantId: scan.tenantId,
      actor: "system:worker",
      action: "scan.fail",
      subject: scanId,
      detail: { error: message },
    });
    log(`scan ${scanId} failed: ${message}`);
    return undefined;
  } finally {
    // The checkout and ZIP source are destroyed whatever happened. Source is never retained.
    for (const result of checkouts) {
      await result.cleanup().catch(() => {});
    }
    for (const dir of tempDirsToClean) {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
    for (const zipPath of zipKeysToClean) {
      await rm(zipPath, { force: true }).catch(() => {});
    }
  }
}

function nameOf(targets: readonly ScanTarget[]): string | undefined {
  for (const target of targets) {
    if (target.kind === "git-repository" || target.kind === "zip-archive") {
      return target.name || path.basename(target.localPath ?? "");
    }
  }
  return targets[0]?.kind === "tls-endpoint" ? targets[0].host : undefined;
}
