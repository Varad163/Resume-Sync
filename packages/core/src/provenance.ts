/**
 * Provenance is the spine of the product.
 *
 * Nothing the platform asserts is allowed to exist without a record of where it
 * came from. A collector rule found it, or an agent judged it — and in the
 * second case we keep the model, the prompt version, the token cost and the
 * stated reasoning, so any conclusion can be re-examined months later by
 * someone who was not in the room.
 */

export type EvidenceKind =
  | "source-span"
  | "dependency"
  | "network-observation"
  | "certificate"
  | "config";

export interface Evidence {
  readonly kind: EvidenceKind;
  /** File path, package coordinate, or `host:port` — whatever identifies it. */
  readonly locator: string;
  readonly startLine?: number;
  readonly endLine?: number;
  /** Bounded excerpt. Never the whole file; may be omitted in metadata-only mode. */
  readonly snippet?: string;
  /** SHA-256 of the exact bytes examined, so a re-scan can prove nothing moved. */
  readonly snippetSha256?: string;
  readonly observedAt: string;
}

export interface CollectorProvenance {
  readonly source: "collector";
  readonly collectorId: string;
  readonly collectorVersion: string;
  readonly ruleId: string;
  /** The collector's own confidence, before any agent looks at it. */
  readonly confidence: number;
  readonly evidence: readonly Evidence[];
}

export interface AgentProvenance {
  readonly source: "agent";
  readonly agentId: string;
  readonly model: string;
  readonly promptVersion: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly rationale: string;
  readonly decidedAt: string;
}

export type Provenance = CollectorProvenance | AgentProvenance;

export function isAgentProvenance(p: Provenance): p is AgentProvenance {
  return p.source === "agent";
}
