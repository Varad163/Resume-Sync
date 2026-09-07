/**
 * Migration planning types, and the public milestone calendar a plan is
 * measured against.
 *
 * The milestone dates are cited from public policy documents. They are the
 * reason a plan is urgent or not, so they carry their source with them.
 */

import type { AgentProvenance } from "./provenance.js";
import type { Severity } from "./findings.js";

export interface Milestone {
  readonly id: string;
  readonly year: number;
  readonly title: string;
  readonly expectation: string;
  readonly source: string;
}

export const MILESTONES: readonly Milestone[] = [
  {
    id: "inventory-2026",
    year: 2026,
    title: "Cryptographic inventory complete",
    expectation:
      "Organisations are expected to hold a discovered, maintained inventory of cryptographic use, not a point-in-time spreadsheet.",
    source: "NIST IR 8547 (initial public draft), CISA post-quantum guidance",
  },
  {
    id: "high-priority-2028",
    year: 2028,
    title: "High-priority systems migrated",
    expectation:
      "Systems protecting data with a long confidentiality lifetime, and externally exposed key exchange, should be migrated first.",
    source: "NIST IR 8547; UK NCSC PQC migration timelines",
  },
  {
    id: "deprecation-2030",
    year: 2030,
    title: "112-bit classical strength deprecated",
    expectation:
      "RSA-2048, ECDSA P-256 and finite-field DH at 112-bit strength are deprecated for federal use from 2030.",
    source: "NIST IR 8547",
  },
  {
    id: "disallowed-2035",
    year: 2035,
    title: "Quantum-vulnerable cryptography disallowed",
    expectation:
      "Quantum-vulnerable algorithms are disallowed; migration to the standardised post-quantum suite is expected to be complete.",
    source: "NIST IR 8547; CNSA 2.0",
  },
];

/** How a given replacement is carried out, which is what drives effort. */
export type MigrationApproach =
  | "drop-in"
  | "parameter-change"
  | "hybrid"
  | "protocol-upgrade"
  | "re-architect"
  | "vendor-dependency";

export type EffortSize = "S" | "M" | "L" | "XL";

export const EFFORT_DAYS: Record<EffortSize, number> = { S: 0.5, M: 1.5, L: 3, XL: 6 };

export interface MigrationAction {
  readonly id: string;
  readonly findingIds: readonly string[];
  readonly component: string;
  readonly currentAlgorithm: string;
  readonly targetAlgorithm: string;
  readonly approach: MigrationApproach;
  readonly effort: EffortSize;
  readonly severity: Severity;
  readonly rationale: string;
  /** Ids of actions that must land first. */
  readonly dependsOn: readonly string[];
  readonly risks: readonly string[];
  readonly validation: readonly string[];
}

export interface MigrationWave {
  readonly id: string;
  readonly name: string;
  readonly rationale: string;
  readonly milestoneId: string;
  readonly actions: readonly MigrationAction[];
}

export interface MigrationPlan {
  readonly scanId: string;
  readonly generatedAt: string;
  readonly summary: string;
  readonly waves: readonly MigrationWave[];
  readonly totalEffortDays: number;
  /** Milestones this plan does not meet at the current shape, and why. */
  readonly milestoneRisks: readonly {
    readonly milestoneId: string;
    readonly atRisk: boolean;
    readonly reason: string;
  }[];
  readonly provenance: AgentProvenance;
}

export function milestoneById(id: string): Milestone | undefined {
  return MILESTONES.find((m) => m.id === id);
}
