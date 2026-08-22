import type { Candidate, ScanTarget } from "@ironbastion/core";

export interface CollectorContext {
  readonly scanId: string;
  /** When true, no source text leaves the worker — evidence carries hashes only. */
  readonly metadataOnly: boolean;
  now(): string;
  log?(message: string): void;
}

export interface CollectorOutput {
  readonly candidates: readonly Candidate[];
  readonly unitsScanned: number;
  /** Anything the operator should know: skipped files, truncation, timeouts. */
  readonly notes: readonly string[];
}

export interface Collector {
  readonly id: string;
  readonly version: string;
  supports(target: ScanTarget): boolean;
  collect(target: ScanTarget, ctx: CollectorContext): Promise<CollectorOutput>;
}

export const EMPTY_OUTPUT: CollectorOutput = { candidates: [], unitsScanned: 0, notes: [] };
