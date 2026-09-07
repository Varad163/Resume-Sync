/**
 * The rule-based fallback.
 *
 * When no model is configured — local development, an air-gapped evaluation, or
 * a scan that has exhausted its budget mid-campaign — the pipeline still has to
 * finish and produce something usable. These functions do the agents' job with
 * fixed heuristics.
 *
 * They are never allowed to look like agent output. Everything they produce is
 * stamped `deterministic-rules` as the model, and every rationale opens by
 * saying no model was consulted. A customer reading a report must be able to
 * see, per finding, whether a model actually judged it.
 */

import {
  EFFORT_DAYS,
  type Candidate,
  type DataLifetime,
  type EffortSize,
  type Finding,
  type MigrationApproach,
  type Reachability,
} from "@ironbastion/core";
import { estimateMigrationDifficulty } from "@ironbastion/risk";
import type { SentinelVerdict } from "./sentinel.js";
import type { OracleAssessment } from "./oracle.js";
import type { PlanSubmission, PlannedAction } from "./migrate.js";
import { sanctionedReplacements } from "./migrate.js";

export const DETERMINISTIC_MODEL = "deterministic-rules/1.0";
const PREFIX = "No model was consulted for this finding; rule-based fallback.";

export function deterministicAdjudicate(candidates: readonly Candidate[]): SentinelVerdict[] {
  return candidates.map((candidate) => {
    const locator = candidate.provenance.evidence[0]?.locator ?? "";
    const reachability = reachabilityOf(candidate, locator);
    const unresolved = candidate.algorithm === "UNRESOLVED";

    return {
      candidateId: candidate.id,
      status: unresolved ? "needs-human" : "confirmed",
      // SENTINEL's confidence is about identity — is this really this
      // algorithm — not about impact. A literal `getInstance("RSA")` is not
      // made uncertain by the absence of a model; what needs a model is the
      // indirect case, and ORACLE's impact evidence, which stays low.
      confidence: unresolved ? 0.3 : identityConfidence(candidate),
      reachability,
      rationale: unresolved
        ? `${PREFIX} The collector could not resolve the algorithm at ${locator}, and resolving it requires reading the surrounding code, so it is routed to a human.`
        : `${PREFIX} Rule ${candidate.provenance.ruleId} fired at ${locator} with collector confidence ${candidate.provenance.confidence}; reachability inferred from the path as ${reachability}.`,
    };
  });
}

/** High where the collector read a literal; low where something indirects it. */
function identityConfidence(candidate: Candidate): number {
  const indirect =
    candidate.ambiguity.includes("indirect-algorithm") ||
    candidate.ambiguity.includes("configurable-at-runtime") ||
    candidate.ambiguity.includes("wrapper-library");
  return indirect ? 0.45 : Math.min(0.9, candidate.provenance.confidence);
}

function reachabilityOf(candidate: Candidate, locator: string): Reachability {
  if (candidate.ambiguity.includes("test-scope") || /(^|\/)(src\/test|tests?)\//.test(locator)) {
    return "test-only";
  }
  if (candidate.provenance.collectorId === "jvm-deps" || candidate.provenance.collectorId === "npm-deps" || candidate.provenance.collectorId === "pypi-deps") return "unknown";
  if (candidate.provenance.collectorId === "python-source" || candidate.provenance.collectorId === "js-source") return "runtime";
  if (/src\/main\//.test(locator)) return "runtime";
  if (candidate.provenance.collectorId === "tls-probe") return "runtime";
  return "unknown";
}

/** Keyword evidence for how long protected data stays sensitive. */
const LIFETIME_SIGNALS: readonly { pattern: RegExp; lifetime: DataLifetime; why: string }[] = [
  { pattern: /token|card|pan|payment|settle|ledger|account|kyc|identity|passport|health|medical|archive|contract/i, lifetime: "long", why: "the component names payment, identity or record-keeping data" },
  { pattern: /session|nonce|csrf|otp|cache|temp/i, lifetime: "ephemeral", why: "the component names short-lived session material" },
  { pattern: /audit|log|report/i, lifetime: "medium", why: "the component names operational records" },
];

const EXTERNAL_SIGNALS = /gateway|api|controller|public|external|edge|transport|client|http|tls|endpoint/i;
const ISOLATED_SIGNALS = /internal|admin|batch|cron|worker/i;

export function deterministicAssess(candidates: readonly Candidate[]): OracleAssessment[] {
  return candidates.map((candidate) => {
    const haystack = `${candidate.component} ${candidate.description} ${candidate.title}`;
    const signal = LIFETIME_SIGNALS.find((entry) => entry.pattern.test(haystack));
    const external = EXTERNAL_SIGNALS.test(haystack);
    const isolated = !external && ISOLATED_SIGNALS.test(haystack);

    return {
      candidateId: candidate.id,
      dataLifetime: signal?.lifetime ?? "unknown",
      exposure: external ? "external" : isolated ? "isolated" : "unknown",
      confidence: 0.35,
      rationale: `Rule-based impact estimate. Data lifetime taken as ${signal?.lifetime ?? "unknown"}${signal ? ` because ${signal.why}` : " because no keyword evidence was found"}; exposure inferred from the component name only. A model or a human should revisit both.`,
    };
  });
}

const APPROACH_BY_PRIMITIVE: Record<string, MigrationApproach> = {
  "public-key-encryption": "re-architect",
  "key-agreement": "hybrid",
  "key-encapsulation": "drop-in",
  signature: "drop-in",
  certificate: "vendor-dependency",
  protocol: "protocol-upgrade",
  "block-cipher": "parameter-change",
  "stream-cipher": "parameter-change",
  hash: "drop-in",
  mac: "drop-in",
  kdf: "parameter-change",
  drbg: "drop-in",
  "key-store": "drop-in",
  unknown: "drop-in",
};

export function deterministicPlan(findings: readonly Finding[]): PlanSubmission {
  const sanctioned = sanctionedReplacements(findings);
  const migratable = findings.filter((finding) => sanctioned.has(finding.id));

  // One action per component-plus-algorithm: the unit of work an engineer picks up.
  const grouped = new Map<string, Finding[]>();
  for (const finding of migratable) {
    const key = `${finding.component}::${finding.algorithm}`;
    const bucket = grouped.get(key);
    if (bucket) bucket.push(finding);
    else grouped.set(key, [finding]);
  }

  const actions: PlannedAction[] = [...grouped.entries()]
    .sort((a, b) => worstScore(b[1]) - worstScore(a[1]))
    .map(([key, group], index) => {
      const head = group[0]!;
      const difficulty = estimateMigrationDifficulty(head);
      return {
        id: `action-${index + 1}`,
        findingIds: group.map((f) => f.id),
        component: head.component,
        currentAlgorithm: head.algorithm,
        targetAlgorithm: sanctioned.get(head.id)!,
        approach: APPROACH_BY_PRIMITIVE[head.primitive] ?? "drop-in",
        effort: effortFor(difficulty.score, group.length),
        // The disclosure lives on the plan summary and each wave; repeating it
        // on every action buries the substance the reader is here for.
        rationale: `${group.length} occurrence(s) of ${head.algorithm} in ${head.component}, worst risk ${worstScore(group)}. Grouped by component and algorithm: ${key}.`,
        dependsOn: [],
        risks: [
          "Rule-based plan: sequencing has not been reviewed by a model or an engineer.",
          `Replacing ${head.algorithm} changes wire or storage format and requires coordinated rollout.`,
        ],
        validation: [
          `Confirm no ${head.algorithm} remains in ${head.component} on a re-scan.`,
          "Run the component's test suite and an interoperability test against a peer that has not yet migrated.",
        ],
      };
    });

  const first = actions.filter((_, index) => index < Math.ceil(actions.length / 2));
  const rest = actions.filter((_, index) => index >= Math.ceil(actions.length / 2));

  const waves = [
    first.length > 0
      ? {
          id: "wave-1",
          name: "Highest exposure first",
          rationale: `Ordered by computed risk score; the highest-scoring components are scheduled first. ${PREFIX}`,
          milestoneId: "high-priority-2028",
          actions: first,
        }
      : undefined,
    rest.length > 0
      ? {
          id: "wave-2",
          name: "Remaining quantum-vulnerable cryptography",
          rationale: `Everything not scheduled in wave 1, ahead of the 2035 prohibition. ${PREFIX}`,
          milestoneId: "disallowed-2035",
          actions: rest,
        }
      : undefined,
  ].filter((wave): wave is NonNullable<typeof wave> => !!wave);

  const totalDays = Math.round(actions.reduce((sum, action) => sum + EFFORT_DAYS[action.effort], 0) * 10) / 10;

  return {
    summary: `${migratable.length} quantum-vulnerable finding(s) across ${grouped.size} component-algorithm group(s), estimated at ~${totalDays} days of effort (assuming AI-assisted remediation). ${PREFIX} This is a mechanical ordering by risk score, not a reviewed migration plan.`,
    waves,
    milestoneRisks: [
      {
        milestoneId: "deprecation-2030",
        atRisk: totalDays > 25,
        reason: `Rule-based estimate of ~${totalDays} days against the 2030 deprecation of 112-bit classical strength.`,
      },
    ],
  };
}

function worstScore(findings: readonly Finding[]): number {
  return Math.max(...findings.map((finding) => finding.risk.score));
}

function effortFor(difficulty: number, occurrences: number): EffortSize {
  const weighted = difficulty + Math.min(0.3, occurrences / 40);
  if (weighted >= 0.95) return "XL";
  if (weighted >= 0.7) return "L";
  if (weighted >= 0.4) return "M";
  return "S";
}
