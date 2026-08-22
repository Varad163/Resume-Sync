import { createHash, randomUUID } from "node:crypto";

export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
}

export function sha256(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/**
 * A stable identity for a candidate, so the same finding keeps the same id
 * across re-scans and can be tracked, suppressed and closed over time.
 */
export function stableCandidateId(parts: {
  component: string;
  ruleId: string;
  locator: string;
  line?: number;
  algorithm: string;
}): string {
  const digest = sha256(
    [parts.component, parts.ruleId, parts.locator, parts.line ?? "", parts.algorithm].join("|"),
  );
  return `cand_${digest.slice(0, 24)}`;
}
