/**
 * Continuous Posture Monitoring (Watchtower).
 *
 * Provides utilities to compute stable comparison diffs between two scans of a project.
 */

import type { Finding } from "./findings.js";

export interface PersistentFindingDiff {
  readonly finding: Finding;
  readonly previousScore: number;
  readonly currentScore: number;
  readonly scoreDelta: number;
  readonly severityChanged: boolean;
  readonly previousSeverity: string;
  readonly currentSeverity: string;
}

export interface WatchtowerDiff {
  readonly status: "success" | "insufficient-history";
  readonly scoreShift: number;
  readonly previousScore: number;
  readonly currentScore: number;
  readonly introduced: readonly Finding[];
  readonly resolved: readonly Finding[];
  readonly persistent: readonly PersistentFindingDiff[];
}

/** Computes a stable identity fingerprint for a finding, excluding line numbers. */
export function getFindingFingerprint(finding: Finding): string {
  const locator = finding.provenance.evidence[0]?.locator ?? "";
  return [
    finding.algorithm,
    finding.primitive,
    finding.component,
    finding.provenance.collectorId,
    finding.provenance.ruleId,
    locator,
  ].join("::");
}

/** Computes the comparative posture difference between a previous scan and the current scan. */
export function computeWatchtowerDiff(
  previousFindings: readonly Finding[],
  currentFindings: readonly Finding[],
  previousScore: number,
  currentScore: number,
): WatchtowerDiff {
  const prevMap = new Map<string, Finding>();
  for (const f of previousFindings) {
    prevMap.set(getFindingFingerprint(f), f);
  }

  const currMap = new Map<string, Finding>();
  for (const f of currentFindings) {
    currMap.set(getFindingFingerprint(f), f);
  }

  const introduced: Finding[] = [];
  const persistent: PersistentFindingDiff[] = [];
  const resolved: Finding[] = [];

  // Find introduced and persistent findings
  for (const [fingerprint, currFinding] of currMap) {
    const prevFinding = prevMap.get(fingerprint);
    if (!prevFinding) {
      introduced.push(currFinding);
    } else {
      const prevFScore = prevFinding.risk.score;
      const currFScore = currFinding.risk.score;
      const prevSeverity = prevFinding.risk.severity;
      const currSeverity = currFinding.risk.severity;

      persistent.push({
        finding: currFinding,
        previousScore: prevFScore,
        currentScore: currFScore,
        scoreDelta: currFScore - prevFScore,
        severityChanged: prevSeverity !== currSeverity,
        previousSeverity: prevSeverity,
        currentSeverity: currSeverity,
      });
    }
  }

  // Find resolved findings
  for (const [fingerprint, prevFinding] of prevMap) {
    if (!currMap.has(fingerprint)) {
      resolved.push(prevFinding);
    }
  }

  return {
    status: "success",
    scoreShift: currentScore - previousScore,
    previousScore,
    currentScore,
    introduced,
    resolved,
    persistent,
  };
}
