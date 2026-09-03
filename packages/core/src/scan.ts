/** Scan targets, campaign state, and the phases a campaign moves through. */

import type { Candidate, Finding } from "./findings.js";

export interface GitRepositoryTarget {
  readonly kind: "git-repository";
  readonly id: string;
  readonly name: string;
  /** Already-checked-out path, used by the CLI and by the worker after cloning. */
  readonly localPath?: string;
  readonly remoteUrl?: string;
  readonly ref?: string;
  readonly provider?: "github" | string;
  readonly githubRepositoryId?: number;
  readonly githubOwner?: string;
  readonly githubRepo?: string;
}

export interface TlsEndpointTarget {
  readonly kind: "tls-endpoint";
  readonly id: string;
  readonly host: string;
  readonly port: number;
  readonly serverName?: string;
}

export interface ZipArchiveTarget {
  readonly kind: "zip-archive";
  readonly id: string;
  readonly name: string;
  readonly zipKey?: string;
  readonly zipFilename?: string;
  readonly localPath?: string;
}

export type ScanTarget = GitRepositoryTarget | TlsEndpointTarget | ZipArchiveTarget;

export type ScanPhase = "DISCOVER" | "ANALYZE" | "PLAN" | "REPORT" | "DONE";

export const SCAN_PHASES: readonly ScanPhase[] = ["DISCOVER", "ANALYZE", "PLAN", "REPORT", "DONE"];

export type ScanStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export interface ScanOptions {
  /** Send no source text to the model; agents reason from metadata alone. */
  readonly metadataOnly: boolean;
  /** Hard ceiling on model spend for one scan, in US cents. */
  readonly budgetCents: number;
  /** Candidates below this agent confidence route to a human instead of publishing. */
  readonly humanReviewThreshold: number;
}

export const DEFAULT_SCAN_OPTIONS: ScanOptions = {
  metadataOnly: false,
  budgetCents: 500,
  humanReviewThreshold: 0.6,
};

export interface ScanStats {
  readonly filesScanned: number;
  readonly candidatesFound: number;
  readonly findingsConfirmed: number;
  readonly findingsRejected: number;
  readonly needsHuman: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly costCents: number;
}

export const EMPTY_STATS: ScanStats = {
  filesScanned: 0,
  candidatesFound: 0,
  findingsConfirmed: 0,
  findingsRejected: 0,
  needsHuman: 0,
  inputTokens: 0,
  outputTokens: 0,
  costCents: 0,
};

export interface ScanRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly projectId: string;
  readonly status: ScanStatus;
  readonly phase: ScanPhase;
  readonly targets: readonly ScanTarget[];
  readonly options: ScanOptions;
  readonly startedAt: string;
  readonly finishedAt?: string;
  readonly error?: string;
  readonly stats: ScanStats;
}

/** What a completed campaign produces. */
export interface ScanResult {
  readonly scan: ScanRecord;
  readonly candidates: readonly Candidate[];
  readonly findings: readonly Finding[];
}
