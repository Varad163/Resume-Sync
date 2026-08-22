/**
 * Candidates and findings.
 *
 * A collector emits a `Candidate`: something that looks like cryptography, with
 * evidence attached. An agent adjudicates it into a `Finding`, or rejects it.
 * The distinction is enforced in the type system so no code path can publish an
 * unadjudicated candidate as a fact.
 */

import type { CryptoPrimitive, QuantumVulnerability } from "./algorithms.js";
import type { AgentProvenance, CollectorProvenance } from "./provenance.js";

export interface CryptoParameters {
  readonly keySize?: number;
  readonly curve?: string;
  readonly mode?: string;
  readonly padding?: string;
  readonly digest?: string;
  readonly provider?: string;
  readonly protocolVersion?: string;
}

/** Why a candidate needs an agent's judgement rather than going straight through. */
export type AmbiguityReason =
  | "indirect-algorithm"
  | "unresolved-parameter"
  | "reachability-unknown"
  | "wrapper-library"
  | "test-scope"
  | "configurable-at-runtime";

export interface Candidate {
  readonly id: string;
  readonly scanId: string;
  /** Canonical registry id where resolved, else the raw string as written. */
  readonly algorithm: string;
  readonly primitive: CryptoPrimitive;
  readonly parameters: CryptoParameters;
  readonly quantum: QuantumVulnerability;
  readonly title: string;
  readonly description: string;
  /** Repository, module, service or endpoint this belongs to. */
  readonly component: string;
  readonly provenance: CollectorProvenance;
  readonly ambiguity: readonly AmbiguityReason[];
}

/** Where the code actually runs. A test-only dependency is not a production risk. */
export type Reachability = "runtime" | "build-only" | "test-only" | "dead-code" | "unknown";

/** How long the protected data stays sensitive — the harvest-now-decrypt-later axis. */
export type DataLifetime = "ephemeral" | "short" | "medium" | "long" | "indefinite" | "unknown";

export type AdjudicationStatus = "confirmed" | "rejected" | "needs-human";

export interface Adjudication {
  readonly status: AdjudicationStatus;
  /** 0–1. Below the tenant's threshold this routes to a human instead. */
  readonly confidence: number;
  readonly reachability: Reachability;
  readonly dataLifetime: DataLifetime;
  /** Internet-facing, internal, or air-gapped — drives exposure weighting. */
  readonly exposure: "external" | "internal" | "isolated" | "unknown";
  readonly rationale: string;
  readonly provenance: AgentProvenance;
  /** Set when a person overrode the agent. */
  readonly humanOverride?: {
    readonly by: string;
    readonly at: string;
    readonly status: AdjudicationStatus;
    readonly note: string;
  };
}

export type Severity = "critical" | "high" | "medium" | "low" | "informational";

export interface RiskScore {
  /** 0–100. Computed, never written by a model. */
  readonly score: number;
  readonly severity: Severity;
  readonly factors: {
    readonly quantumExposure: number;
    readonly dataLifetime: number;
    readonly reachability: number;
    readonly networkExposure: number;
    readonly migrationDifficulty: number;
  };
  readonly explanation: string;
}

export interface Finding extends Candidate {
  readonly adjudication: Adjudication;
  readonly risk: RiskScore;
  readonly recommendedAlgorithm?: string;
}

export function isPublished(finding: Finding): boolean {
  const status = finding.adjudication.humanOverride?.status ?? finding.adjudication.status;
  return status === "confirmed";
}
