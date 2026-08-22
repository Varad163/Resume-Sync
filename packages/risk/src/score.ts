/**
 * The quantum risk score.
 *
 * Five factors, fixed weights, one arithmetic expression. No model writes this
 * number: an agent supplies the *evidence* — how long the data stays sensitive,
 * whether the code is reachable, how exposed the component is — and the formula
 * turns that evidence into a score the same way every time. Two scans of the
 * same estate with the same evidence produce the same number, which is what
 * makes a trend line meaningful and an audit possible.
 */

import {
  algorithmById,
  type Adjudication,
  type Candidate,
  type DataLifetime,
  type Reachability,
  type RiskScore,
  type Severity,
} from "@ironbastion/core";
import { clamp, estimateMigrationDifficulty } from "./difficulty.js";

/**
 * Weights of the exposure factors. Reachability is deliberately absent: it is
 * not a term in the sum but a gate on the whole result, because cryptography
 * that never executes protects nothing, however alarming the algorithm and
 * however long-lived the data it would have protected.
 */
export const WEIGHTS = {
  quantumExposure: 0.45,
  dataLifetime: 0.3,
  networkExposure: 0.2,
  migrationDifficulty: 0.05,
} as const;

const REACHABILITY_GATE: Record<Reachability, number> = {
  runtime: 1,
  "build-only": 0.5,
  "test-only": 0.25,
  "dead-code": 0.15,
  unknown: 0.8,
};

const QUANTUM_FACTOR = {
  broken: 1,
  weakened: 0.5,
  safe: 0.05,
  unknown: 0.6,
} as const;

/**
 * Harvest-now-decrypt-later in one column: data that must stay confidential
 * beyond the arrival of a cryptographically relevant quantum computer is
 * already exposed today, because it can be recorded today.
 */
const LIFETIME_FACTOR: Record<DataLifetime, number> = {
  indefinite: 1,
  long: 0.85,
  medium: 0.55,
  short: 0.25,
  ephemeral: 0.1,
  unknown: 0.6,
};

const REACHABILITY_FACTOR: Record<Reachability, number> = {
  runtime: 1,
  "build-only": 0.4,
  "test-only": 0.15,
  "dead-code": 0.05,
  unknown: 0.7,
};

const EXPOSURE_FACTOR = {
  external: 1,
  internal: 0.6,
  isolated: 0.25,
  unknown: 0.6,
} as const;

export function severityFor(score: number): Severity {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 40) return "medium";
  if (score >= 20) return "low";
  return "informational";
}

export function scoreFinding(candidate: Candidate, adjudication: Adjudication): RiskScore {
  const difficulty = estimateMigrationDifficulty(candidate);

  const factors = {
    quantumExposure: QUANTUM_FACTOR[candidate.quantum],
    dataLifetime: LIFETIME_FACTOR[adjudication.dataLifetime],
    reachability: REACHABILITY_FACTOR[adjudication.reachability],
    networkExposure: EXPOSURE_FACTOR[adjudication.exposure],
    migrationDifficulty: difficulty.score,
  };

  const exposure =
    factors.quantumExposure * WEIGHTS.quantumExposure +
    factors.dataLifetime * WEIGHTS.dataLifetime +
    factors.networkExposure * WEIGHTS.networkExposure +
    factors.migrationDifficulty * WEIGHTS.migrationDifficulty;

  let score = Math.round(clamp(exposure * REACHABILITY_GATE[adjudication.reachability]) * 100);
  const adjustments: string[] = [];

  // An algorithm that is broken classically is not a future problem. It floors
  // at high severity wherever it actually runs, whatever the quantum weighting
  // says — SHA-1 in a signature path is an incident today.
  const entry = algorithmById(candidate.algorithm);
  if (entry?.classicallyBroken && adjudication.reachability === "runtime" && score < 65) {
    score = 65;
    adjustments.push(
      `${entry.name} is already broken classically (${entry.reference}), so the score is floored while it remains reachable at runtime`,
    );
  }

  // Nothing that only ever runs in a test suite is allowed to read as urgent.
  if (adjudication.reachability === "test-only" && score > 35) {
    score = 35;
    adjustments.push("capped: this code path exists only in tests");
  }

  const explanation = buildExplanation(candidate, adjudication, factors, difficulty.drivers, adjustments);
  return { score, severity: severityFor(score), factors, explanation };
}

function buildExplanation(
  candidate: Candidate,
  adjudication: Adjudication,
  factors: RiskScore["factors"],
  difficultyDrivers: readonly string[],
  adjustments: readonly string[],
): string {
  const parts: string[] = [];

  parts.push(
    candidate.quantum === "broken"
      ? `${candidate.algorithm} is broken by Shor's algorithm at any parameter set.`
      : candidate.quantum === "weakened"
        ? `${candidate.algorithm} loses half its effective strength to Grover's algorithm at the parameters in use.`
        : candidate.quantum === "safe"
          ? `${candidate.algorithm} is believed to resist quantum attack at the parameters in use.`
          : `${candidate.algorithm} could not be resolved to a known algorithm, so it is weighted as uncertain rather than safe.`,
  );

  if (factors.dataLifetime >= 0.85) {
    parts.push(
      "The data it protects stays sensitive long enough that traffic recorded today is still valuable when the cryptography breaks.",
    );
  }

  parts.push(
    adjudication.reachability === "runtime"
      ? "The code is reachable at runtime."
      : `Reachability was assessed as ${adjudication.reachability}.`,
  );

  if (adjudication.exposure === "external") parts.push("The component is externally exposed.");

  parts.push(`Migration difficulty: ${difficultyDrivers.join("; ")}.`);
  parts.push(...adjustments);

  return parts.join(" ");
}

/** Aggregate posture for a whole scan, computed the same deterministic way. */
export function aggregateScore(scores: readonly RiskScore[]): {
  readonly overall: number;
  readonly severity: Severity;
  readonly counts: Record<Severity, number>;
} {
  const counts: Record<Severity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    informational: 0,
  };
  for (const score of scores) counts[score.severity]++;

  if (scores.length === 0) {
    return { overall: 0, severity: "informational", counts };
  }

  // Posture severity is the severity of the worst unmitigated exposure: one
  // externally reachable RSA key protecting thirty-year data is a critical
  // position no matter how much safe cryptography surrounds it. The numeric
  // score blends the worst case with the top decile so that the number still
  // moves as the tail is fixed — it is a trend line, not the verdict.
  const sorted = [...scores].map((s) => s.score).sort((a, b) => b - a);
  const worst = sorted[0]!;
  const topDecile = sorted.slice(0, Math.max(1, Math.ceil(sorted.length * 0.1)));
  const topMean = topDecile.reduce((sum, value) => sum + value, 0) / topDecile.length;
  const overall = Math.round(worst * 0.75 + topMean * 0.25);

  return { overall, severity: severityFor(worst), counts };
}
