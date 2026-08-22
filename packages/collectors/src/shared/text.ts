/** Extraction of a bounded, hashed excerpt — the unit of evidence we keep. */

import { sha256 } from "@ironbastion/core";

export interface Excerpt {
  readonly snippet: string;
  readonly snippetSha256: string;
  readonly startLine: number;
  readonly endLine: number;
}

/**
 * Takes `context` lines either side of `line`. The hash covers the excerpt
 * exactly as returned, so a later re-scan can prove the code did not move.
 */
export function excerpt(source: string, line: number, context = 2): Excerpt {
  const lines = source.split("\n");
  const start = Math.max(1, line - context);
  const end = Math.min(lines.length, line + context);
  const snippet = lines.slice(start - 1, end).join("\n");
  return { snippet, snippetSha256: sha256(snippet), startLine: start, endLine: end };
}
