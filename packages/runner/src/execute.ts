/**
 * Executing one scan, from queued row to stored artefacts.
 *
 * This is the only place that knows how a scan actually happens, so the API's
 * inline mode and the Fargate worker cannot drift apart. Failures are recorded
 * on the scan row rather than thrown away: a customer who triggers a scan is
 * entitled to know why it did not finish.
 */

import path from "node:path";
import {
  completeScan,
  failScan,
  getScanUnscoped,
  recordAudit,
  updateScanPhase,
  type Database,
} from "@ironbastion/db";
import { runCampaign, type CampaignResult, type ModelClient } from "@ironbastion/agents";
import type { ScanRecord, ScanTarget } from "@ironbastion/core";
import { checkout, redact, type CheckoutResult } from "./checkout.js";

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
  try {
    await updateScanPhase(db, scanId, "DISCOVER", "running");

    const targets: ScanTarget[] = [];
    for (const target of scan.targets) {
      if (target.kind === "git-repository" && !target.localPath && target.remoteUrl) {
        log(`cloning ${redact(target.remoteUrl)}`);
        const result = await checkout({
          remoteUrl: target.remoteUrl,
          ...(target.ref ? { ref: target.ref } : {}),
          ...(options.gitToken ? { token: options.gitToken } : {}),
        });
        checkouts.push(result);
        targets.push({ ...target, localPath: result.path });
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
    // The checkout is destroyed whatever happened. Source is never retained.
    for (const result of checkouts) {
      await result.cleanup().catch(() => {});
    }
  }
}

function nameOf(targets: readonly ScanTarget[]): string | undefined {
  for (const target of targets) {
    if (target.kind === "git-repository") return target.name || path.basename(target.localPath ?? "");
  }
  return targets[0]?.kind === "tls-endpoint" ? targets[0].host : undefined;
}
