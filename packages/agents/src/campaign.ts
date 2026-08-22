/**
 * The scan campaign.
 *
 * DISCOVER with the collectors, ANALYZE with SENTINEL and ORACLE, score with
 * the risk engine, assemble the CBOM, then PLAN with MIGRATE. Each phase reports
 * as it completes, so a campaign that dies halfway leaves a partial result
 * rather than nothing.
 *
 * The budget is enforced across the whole campaign. When it runs out the run
 * does not fail — the remaining work falls through to the rule-based path, and
 * the result records which findings a model actually judged.
 */

import {
  EFFORT_DAYS,
  type AgentProvenance,
  type Adjudication,
  type Candidate,
  type Finding,
  type MigrationPlan,
  type ScanPhase,
  type ScanRecord,
  type ScanStats,
  type ScanTarget,
} from "@ironbastion/core";
import { ALL_COLLECTORS, type CollectorContext } from "@ironbastion/collectors";
import { scoreFinding, aggregateScore } from "@ironbastion/risk";
import { buildCbom, type CycloneDxBom } from "@ironbastion/cbom";
import { pqcReplacementFor } from "@ironbastion/core";
import { Budget, BudgetExhausted } from "./budget.js";
import type { ModelClient } from "./client.js";
import { adjudicate, applyResolution, SENTINEL_PROMPT_VERSION, type SentinelVerdict } from "./sentinel.js";
import { assessImpact, ORACLE_PROMPT_VERSION, type OracleAssessment } from "./oracle.js";
import { summariseInventory, type InventorySummary } from "./atlas.js";
import { planMigration, MIGRATE_PROMPT_VERSION, type PlanSubmission } from "./migrate.js";
import {
  DETERMINISTIC_MODEL,
  deterministicAdjudicate,
  deterministicAssess,
  deterministicPlan,
} from "./deterministic.js";
import type { ToolContext } from "./tools.js";
import { ruleTrace, withDecisions, type AgentDecision, type AgentTrace } from "./trace.js";
import { AgentFailure } from "./runtime.js";

/** Candidates per model call. Small enough to stay sharp, large enough to be cheap. */
const BATCH_SIZE = 12;

export interface CampaignInput {
  readonly scan: ScanRecord;
  /** null runs the whole campaign on the rule-based path. */
  readonly client: ModelClient | null;
  readonly projectName: string;
  readonly log?: (message: string) => void;
  readonly onPhase?: (phase: ScanPhase) => void;
}

export interface CampaignResult {
  readonly scan: ScanRecord;
  readonly candidates: readonly Candidate[];
  readonly findings: readonly Finding[];
  readonly needsHuman: readonly Finding[];
  readonly cbom: CycloneDxBom;
  readonly inventory: InventorySummary;
  readonly plan: MigrationPlan;
  readonly posture: ReturnType<typeof aggregateScore>;
  readonly notes: readonly string[];
  readonly modelJudged: number;
  readonly ruleJudged: number;
  /** What every agent did, in the order they ran. */
  readonly traces: readonly AgentTrace[];
  /** Collector-by-collector discovery record, so DISCOVER is visible too. */
  readonly collectorRuns: readonly CollectorRun[];
}

export interface CollectorRun {
  readonly collectorId: string;
  readonly version: string;
  readonly target: string;
  readonly unitsScanned: number;
  readonly candidates: number;
  readonly durationMs: number;
  readonly notes: readonly string[];
}

export async function runCampaign(input: CampaignInput): Promise<CampaignResult> {
  const { scan } = input;
  const log = input.log ?? (() => {});
  const budget = new Budget(scan.options.budgetCents);
  const notes: string[] = [];

  // ------------------------------------------------------------- DISCOVER
  input.onPhase?.("DISCOVER");
  const collectorContext: CollectorContext = {
    scanId: scan.id,
    metadataOnly: scan.options.metadataOnly,
    now: () => new Date().toISOString(),
    log,
  };

  const candidates: Candidate[] = [];
  const collectorRuns: CollectorRun[] = [];
  const traces: AgentTrace[] = [];
  let unitsScanned = 0;

  for (const target of scan.targets) {
    for (const collector of ALL_COLLECTORS) {
      if (!collector.supports(target)) continue;
      const startedAt = Date.now();
      const output = await collector.collect(target, collectorContext);
      candidates.push(...output.candidates);
      unitsScanned += output.unitsScanned;
      notes.push(...output.notes);
      collectorRuns.push({
        collectorId: collector.id,
        version: collector.version,
        target: describeTarget(target),
        unitsScanned: output.unitsScanned,
        candidates: output.candidates.length,
        durationMs: Date.now() - startedAt,
        notes: output.notes,
      });
    }
  }
  log(`discover: ${candidates.length} candidates from ${unitsScanned} units`);

  // -------------------------------------------------------------- ANALYZE
  input.onPhase?.("ANALYZE");
  const toolContext: ToolContext = {
    ...(repoRootOf(scan.targets) ? { repoRoot: repoRootOf(scan.targets) } : {}),
    metadataOnly: scan.options.metadataOnly,
  };

  let modelJudged = 0;
  let ruleJudged = 0;

  const verdicts = new Map<string, { verdict: SentinelVerdict; provenance: AgentProvenance }>();
  for (const batch of chunk(candidates, BATCH_SIZE)) {
    if (input.client && budget.canSpend()) {
      try {
        const run = await adjudicate({ candidates: batch, client: input.client, budget, toolContext, log });
        const provenance = agentProvenance("sentinel", SENTINEL_PROMPT_VERSION, run);
        for (const verdict of run.value) {
          verdicts.set(verdict.candidateId, {
            verdict,
            provenance: { ...provenance, rationale: verdict.rationale },
          });
        }
        traces.push(
          withDecisions(
            run.trace,
            run.value.map((verdict) => ({
              subject: titleOf(batch, verdict.candidateId),
              outcome: `${verdict.status}, reachability ${verdict.reachability}${verdict.resolvedAlgorithm ? `, resolved to ${verdict.resolvedAlgorithm}` : ""}`,
              confidence: verdict.confidence,
              rationale: verdict.rationale,
            })),
          ),
        );
        modelJudged += run.value.length;
        continue;
      } catch (error) {
        notes.push(`sentinel fell back to rules for ${batch.length} candidate(s): ${(error as Error).message}`);
        if (error instanceof AgentFailure && error.trace) traces.push(error.trace);
        if (!(error instanceof BudgetExhausted)) log(`sentinel error: ${(error as Error).message}`);
      }
    }
    const ruleStarted = Date.now();
    const ruleVerdicts = deterministicAdjudicate(batch);
    for (const verdict of ruleVerdicts) {
      verdicts.set(verdict.candidateId, {
        verdict,
        provenance: ruleProvenance("sentinel", verdict.rationale),
      });
      ruleJudged++;
    }
    traces.push(
      ruleTrace({
        agentId: "sentinel",
        phase: "ANALYZE",
        task: `Adjudicate ${batch.length} candidate finding(s): is each one real, and does it run in production?`,
        durationMs: Date.now() - ruleStarted,
        decisions: ruleVerdicts.map((verdict) => ({
          subject: titleOf(batch, verdict.candidateId),
          outcome: `${verdict.status}, reachability ${verdict.reachability}`,
          confidence: verdict.confidence,
          rationale: verdict.rationale,
        })),
      }),
    );
  }

  // Resolution can change what the algorithm *is*, so apply it before scoring.
  const resolved = candidates.map((candidate) => {
    const entry = verdicts.get(candidate.id);
    return entry ? applyResolution(candidate, entry.verdict) : candidate;
  });

  const kept = resolved.filter((candidate) => {
    const status = verdicts.get(candidate.id)?.verdict.status;
    return status === "confirmed" || status === "needs-human";
  });

  const assessments = new Map<string, { assessment: OracleAssessment; provenance: AgentProvenance }>();
  for (const batch of chunk(kept, BATCH_SIZE)) {
    if (input.client && budget.canSpend()) {
      try {
        const run = await assessImpact({ candidates: batch, client: input.client, budget, toolContext, log });
        const provenance = agentProvenance("oracle", ORACLE_PROMPT_VERSION, run);
        for (const assessment of run.value) {
          assessments.set(assessment.candidateId, {
            assessment,
            provenance: { ...provenance, rationale: assessment.rationale },
          });
        }
        traces.push(
          withDecisions(
            run.trace,
            run.value.map((assessment) => ({
              subject: titleOf(batch, assessment.candidateId),
              outcome: `data lifetime ${assessment.dataLifetime}, exposure ${assessment.exposure}`,
              confidence: assessment.confidence,
              rationale: assessment.rationale,
            })),
          ),
        );
        continue;
      } catch (error) {
        notes.push(`oracle fell back to rules for ${batch.length} finding(s): ${(error as Error).message}`);
        if (error instanceof AgentFailure && error.trace) traces.push(error.trace);
      }
    }
    const oracleStarted = Date.now();
    const ruleAssessments = deterministicAssess(batch);
    for (const assessment of ruleAssessments) {
      assessments.set(assessment.candidateId, {
        assessment,
        provenance: ruleProvenance("oracle", assessment.rationale),
      });
    }
    traces.push(
      ruleTrace({
        agentId: "oracle",
        phase: "ANALYZE",
        task: `Establish what ${batch.length} finding(s) protect: how long the data stays sensitive, and how exposed the component is.`,
        durationMs: Date.now() - oracleStarted,
        decisions: ruleAssessments.map((assessment) => ({
          subject: titleOf(batch, assessment.candidateId),
          outcome: `data lifetime ${assessment.dataLifetime}, exposure ${assessment.exposure}`,
          confidence: assessment.confidence,
          rationale: assessment.rationale,
        })),
      }),
    );
  }

  const findings: Finding[] = kept.map((candidate) => {
    const verdictEntry = verdicts.get(candidate.id)!;
    const assessmentEntry = assessments.get(candidate.id);
    const threshold = scan.options.humanReviewThreshold;

    const status =
      verdictEntry.verdict.status === "confirmed" && verdictEntry.verdict.confidence < threshold
        ? "needs-human"
        : verdictEntry.verdict.status;

    const adjudication: Adjudication = {
      status,
      confidence: verdictEntry.verdict.confidence,
      reachability: verdictEntry.verdict.reachability,
      dataLifetime: assessmentEntry?.assessment.dataLifetime ?? "unknown",
      exposure: assessmentEntry?.assessment.exposure ?? "unknown",
      rationale: [verdictEntry.verdict.rationale, assessmentEntry?.assessment.rationale]
        .filter(Boolean)
        .join(" "),
      provenance: verdictEntry.provenance,
    };

    const replacement = pqcReplacementFor(candidate.algorithm, {
      ...(candidate.parameters.keySize !== undefined ? { keySize: candidate.parameters.keySize } : {}),
    });

    return {
      ...candidate,
      adjudication,
      risk: scoreFinding(candidate, adjudication),
      ...(replacement ? { recommendedAlgorithm: replacement } : {}),
    };
  });

  const confirmed = findings.filter((f) => f.adjudication.status === "confirmed");
  const needsHuman = findings.filter((f) => f.adjudication.status === "needs-human");
  log(`analyze: ${confirmed.length} confirmed, ${needsHuman.length} for human review`);

  // ----------------------------------------------------------------- PLAN
  input.onPhase?.("PLAN");
  const cbom = buildCbom(scan, confirmed, { projectName: input.projectName });

  let inventory: InventorySummary = {
    summary: `${cbom.components.length} cryptographic asset(s) inventoried across ${new Set(confirmed.map((f) => f.component)).size} component(s).`,
    observations: [],
  };
  if (input.client && budget.canSpend() && cbom.components.length > 0) {
    try {
      const run = await summariseInventory({ bom: cbom, client: input.client, budget, toolContext, log });
      inventory = run.value;
      traces.push(
        withDecisions(run.trace, [
          { subject: "Inventory summary", outcome: "written", rationale: run.value.summary },
          ...run.value.observations.map((observation) => ({
            subject: "Observation",
            outcome: "recorded",
            rationale: observation,
          })),
        ]),
      );
    } catch (error) {
      notes.push(`atlas summary unavailable: ${(error as Error).message}`);
      if (error instanceof AgentFailure && error.trace) traces.push(error.trace);
    }
  } else if (cbom.components.length > 0) {
    traces.push(
      ruleTrace({
        agentId: "atlas",
        phase: "PLAN",
        task: `Read the assembled CBOM of ${cbom.components.length} asset(s) and write what it means.`,
        durationMs: 0,
        decisions: [
          {
            subject: "Inventory summary",
            outcome: "counted only",
            rationale: inventory.summary,
          },
        ],
      }),
    );
  }

  let submission: PlanSubmission;
  let planProvenance: AgentProvenance;
  if (input.client && budget.canSpend(20) && confirmed.length > 0) {
    try {
      const run = await planMigration({ findings: confirmed, client: input.client, budget, toolContext, log });
      submission = run.value;
      planProvenance = agentProvenance("migrate", MIGRATE_PROMPT_VERSION, run);
      traces.push(withDecisions(run.trace, planDecisions(submission)));
    } catch (error) {
      notes.push(`migrate fell back to rules: ${(error as Error).message}`);
      if (error instanceof AgentFailure && error.trace) traces.push(error.trace);
      submission = deterministicPlan(confirmed);
      planProvenance = ruleProvenance("migrate", submission.summary);
      traces.push(rulePlanTrace(confirmed.length, submission));
    }
  } else {
    submission = deterministicPlan(confirmed);
    planProvenance = ruleProvenance("migrate", submission.summary);
    if (confirmed.length > 0) traces.push(rulePlanTrace(confirmed.length, submission));
  }

  const plan = toMigrationPlan(scan.id, submission, planProvenance, confirmed);

  // --------------------------------------------------------------- REPORT
  input.onPhase?.("REPORT");
  const posture = aggregateScore(confirmed.map((f) => f.risk));

  const stats: ScanStats = {
    filesScanned: unitsScanned,
    candidatesFound: candidates.length,
    findingsConfirmed: confirmed.length,
    findingsRejected: candidates.length - kept.length,
    needsHuman: needsHuman.length,
    inputTokens: budget.inputTokens,
    outputTokens: budget.outputTokens,
    costCents: Math.round(budget.spentCents * 100) / 100,
  };

  if (ruleJudged > 0) {
    notes.push(
      `${ruleJudged} of ${ruleJudged + modelJudged} candidates were judged by rules rather than a model. Those findings carry lower confidence and are marked as such.`,
    );
  }

  input.onPhase?.("DONE");
  return {
    scan: { ...scan, status: "succeeded", phase: "DONE", finishedAt: new Date().toISOString(), stats },
    traces,
    collectorRuns,
    candidates,
    findings: confirmed,
    needsHuman,
    cbom,
    inventory,
    plan,
    posture,
    notes,
    modelJudged,
    ruleJudged,
  };
}

function toMigrationPlan(
  scanId: string,
  submission: PlanSubmission,
  provenance: AgentProvenance,
  findings: readonly Finding[],
): MigrationPlan {
  const severityOf = new Map(findings.map((finding) => [finding.id, finding.risk.severity]));

  const waves = submission.waves.map((wave) => ({
    id: wave.id,
    name: wave.name,
    rationale: wave.rationale,
    milestoneId: wave.milestoneId,
    actions: wave.actions.map((action) => ({
      id: action.id,
      findingIds: action.findingIds,
      component: action.component,
      currentAlgorithm: action.currentAlgorithm,
      targetAlgorithm: action.targetAlgorithm,
      approach: action.approach,
      effort: action.effort,
      severity: severityOf.get(action.findingIds[0] ?? "") ?? "medium",
      rationale: action.rationale,
      dependsOn: action.dependsOn,
      risks: action.risks,
      validation: action.validation,
    })),
  }));

  const totalEffortDays = waves
    .flatMap((wave) => wave.actions)
    .reduce((sum, action) => sum + EFFORT_DAYS[action.effort], 0);

  return {
    scanId,
    generatedAt: new Date().toISOString(),
    summary: submission.summary,
    waves,
    totalEffortDays,
    milestoneRisks: submission.milestoneRisks,
    provenance,
  };
}

function agentProvenance(
  agentId: string,
  promptVersion: string,
  run: { model: string; inputTokens: number; outputTokens: number; rationale: string },
): AgentProvenance {
  return {
    source: "agent",
    agentId,
    model: run.model,
    promptVersion,
    inputTokens: run.inputTokens,
    outputTokens: run.outputTokens,
    rationale: run.rationale,
    decidedAt: new Date().toISOString(),
  };
}

function ruleProvenance(agentId: string, rationale: string): AgentProvenance {
  return {
    source: "agent",
    agentId,
    model: DETERMINISTIC_MODEL,
    promptVersion: "rules/1.0",
    inputTokens: 0,
    outputTokens: 0,
    rationale,
    decidedAt: new Date().toISOString(),
  };
}

function repoRootOf(targets: readonly ScanTarget[]): string | undefined {
  for (const target of targets) {
    if (target.kind === "git-repository" && target.localPath) return target.localPath;
  }
  return undefined;
}

function titleOf(candidates: readonly Candidate[], id: string): string {
  return candidates.find((candidate) => candidate.id === id)?.title ?? id;
}

function describeTarget(target: ScanTarget): string {
  return target.kind === "git-repository"
    ? `${target.name} (repository)`
    : `${target.host}:${target.port} (TLS endpoint)`;
}

function planDecisions(submission: PlanSubmission): AgentDecision[] {
  return submission.waves.flatMap((wave) =>
    wave.actions.map((action) => ({
      subject: `${action.component}: ${action.currentAlgorithm}`,
      outcome: `${wave.name} — ${action.targetAlgorithm} via ${action.approach} (${action.effort})`,
      rationale: action.rationale,
    })),
  );
}

function rulePlanTrace(findingCount: number, submission: PlanSubmission): AgentTrace {
  return ruleTrace({
    agentId: "migrate",
    phase: "PLAN",
    task: `Sequence migration for ${findingCount} confirmed finding(s) against the public milestones.`,
    durationMs: 0,
    decisions: planDecisions(submission),
  });
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size));
  return batches;
}
