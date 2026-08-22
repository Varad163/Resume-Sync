/**
 * SENTINEL — adjudication.
 *
 * The collectors already found the cryptography. SENTINEL decides what each
 * detection actually *is*: whether the algorithm the rule guessed is the
 * algorithm in use, whether the code runs in production or only in a test, and
 * whether the detection is a false positive. It may read the repository to find
 * out, and it must say what it read.
 *
 * It is explicitly not allowed to invent findings. A candidate it never saw
 * cannot appear in its output — the campaign drops anything it does not
 * recognise, and the prompt says so, because a security product that
 * hallucinates a finding is worse than one that misses it.
 */

import type Anthropic from "@anthropic-ai/sdk";
import {
  assessQuantumVulnerability,
  type Candidate,
  type Reachability,
} from "@ironbastion/core";
import { MODELS, type ModelClient } from "./client.js";
import type { Budget } from "./budget.js";
import { runAgent, type AgentRunResult } from "./runtime.js";
import type { ToolContext } from "./tools.js";
import { asArray, asRecord, asString, asUnitInterval, fail, oneOf, type Validated } from "./validate.js";

export const SENTINEL_PROMPT_VERSION = "sentinel/2026-08-22.1";

const REACHABILITY: readonly Reachability[] = [
  "runtime",
  "build-only",
  "test-only",
  "dead-code",
  "unknown",
];

const STATUSES = ["confirmed", "rejected", "needs-human"] as const;

export interface SentinelVerdict {
  readonly candidateId: string;
  readonly status: (typeof STATUSES)[number];
  readonly confidence: number;
  readonly reachability: Reachability;
  readonly resolvedAlgorithm?: string;
  readonly resolvedKeySize?: number;
  readonly rationale: string;
}

const SYSTEM = `You are SENTINEL, the cryptographic discovery agent of the IronBastion platform.

Deterministic collectors have scanned a repository and produced candidate findings. Each candidate names an algorithm, a location, and the rule that fired. Your job is to adjudicate them — not to search for new ones.

For every candidate you are given, decide:

1. STATUS.
   - "confirmed": the candidate is real cryptography, correctly identified.
   - "rejected": the rule misfired. Say precisely why — a string that is not an algorithm name, a commented-out call, a variable that shadows a crypto class.
   - "needs-human": you cannot settle it from the repository, and a person must look.
2. REACHABILITY: "runtime" if the code can execute in production; "build-only" for build-time tooling; "test-only" if it exists solely in test sources; "dead-code" if nothing reaches it; "unknown" if you could not establish it. Being in src/test is strong evidence for test-only; being called from a service class is strong evidence for runtime.
3. RESOLVED ALGORITHM, where the collector could not resolve it. If a transformation is read from configuration, look for the configured values — defaults in code, properties files, YAML, environment variable defaults — and report what is actually used. If several are possible, report the weakest one you can evidence, and say so.
4. CONFIDENCE between 0 and 1, reflecting the evidence you actually gathered.

Rules that are not negotiable:
- Adjudicate only the candidate ids you were given. Never invent a candidate id.
- Every rationale must cite what you read: a file and line, or the rule that fired. "Looks like a test" is not a rationale; "declared in src/test/java/... and referenced only by @Test methods" is.
- Prefer reading the repository over assuming. You have read-only tools.
- If tools are unavailable, decide from the metadata and lower your confidence accordingly.
- Do not soften a finding to be helpful. A confirmed RSA key transport is a confirmed RSA key transport.

When you are done, call submit_verdicts exactly once with one verdict per candidate.`;

const SUBMIT_TOOL: Anthropic.Tool = {
  name: "submit_verdicts",
  description: "Submit one adjudication per candidate you were given.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      verdicts: {
        type: "array",
        description: "Exactly one entry per candidate id supplied.",
        items: {
          type: "object",
          properties: {
            candidate_id: { type: "string" },
            status: { type: "string", enum: [...STATUSES] },
            confidence: { type: "number", description: "0 to 1." },
            reachability: { type: "string", enum: [...REACHABILITY] },
            resolved_algorithm: {
              type: "string",
              description: "Algorithm actually in use, when the collector could not resolve it. Omit otherwise.",
            },
            resolved_key_size: { type: "integer", description: "Key size in bits, if you established one." },
            rationale: {
              type: "string",
              description: "What you read and what it showed. Cite files and lines.",
            },
          },
          required: ["candidate_id", "status", "confidence", "reachability", "rationale"],
          additionalProperties: false,
        },
      },
    },
    required: ["verdicts"],
    additionalProperties: false,
  },
};

export interface SentinelInput {
  readonly candidates: readonly Candidate[];
  readonly client: ModelClient;
  readonly budget: Budget;
  readonly toolContext: ToolContext;
  readonly log?: (message: string) => void;
}

export async function adjudicate(
  input: SentinelInput,
): Promise<AgentRunResult<SentinelVerdict[]>> {
  const known = new Set(input.candidates.map((c) => c.id));

  return runAgent<SentinelVerdict[]>({
    agentId: "sentinel",
    phase: "ANALYZE",
    promptVersion: SENTINEL_PROMPT_VERSION,
    model: MODELS.reasoning,
    effort: "medium",
    system: SYSTEM,
    task: buildTask(input.candidates, input.toolContext),
    submitTool: SUBMIT_TOOL,
    toolContext: input.toolContext,
    budget: input.budget,
    client: input.client,
    ...(input.log ? { log: input.log } : {}),
    validate: (raw) => validateVerdicts(raw, known),
  });
}

export function buildTask(candidates: readonly Candidate[], toolContext: ToolContext): string {
  const header = toolContext.metadataOnly
    ? "This scan runs in metadata-only mode: you have no access to source text. Adjudicate from the metadata alone and lower your confidence to reflect that."
    : "You may read the repository with the tools provided.";

  const body = candidates
    .map((candidate) => {
      const evidence = candidate.provenance.evidence[0];
      const lines: string[] = [
        `- candidate_id: ${candidate.id}`,
        `  rule: ${candidate.provenance.ruleId} (collector ${candidate.provenance.collectorId}, confidence ${candidate.provenance.confidence})`,
        `  algorithm as detected: ${candidate.algorithm}`,
        `  parameters: ${JSON.stringify(candidate.parameters)}`,
        `  component: ${candidate.component}`,
        `  location: ${evidence?.locator ?? "unknown"}${evidence?.startLine ? `:${evidence.startLine}` : ""}`,
        `  flagged: ${candidate.ambiguity.join(", ") || "none"}`,
        `  description: ${candidate.description}`,
      ];
      if (evidence?.snippet) {
        lines.push(`  excerpt:\n${indent(evidence.snippet, 4)}`);
      }
      return lines.join("\n");
    })
    .join("\n\n");

  return `${header}

Adjudicate these ${candidates.length} candidate finding(s):

${body}

Submit exactly ${candidates.length} verdict(s), one per candidate_id above.`;
}

function indent(text: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return text
    .split("\n")
    .map((line) => `${pad}${line}`)
    .join("\n");
}

export function validateVerdicts(
  raw: unknown,
  known: ReadonlySet<string>,
): Validated<SentinelVerdict[]> {
  const record = asRecord(raw);
  const entries = asArray(record?.["verdicts"]);
  if (!entries) return fail("expected an object with a `verdicts` array");

  const verdicts: SentinelVerdict[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    const item = asRecord(entry);
    if (!item) return fail("each verdict must be an object");

    const candidateId = asString(item["candidate_id"], 200);
    if (!candidateId) return fail("every verdict needs a candidate_id");
    if (!known.has(candidateId)) {
      return fail(
        `candidate_id ${candidateId} was not in the list you were given; adjudicate only the candidates supplied`,
      );
    }
    if (seen.has(candidateId)) return fail(`duplicate verdict for ${candidateId}`);
    seen.add(candidateId);

    const status = oneOf(item["status"], STATUSES);
    if (!status) return fail(`status for ${candidateId} must be one of ${STATUSES.join(", ")}`);

    const confidence = asUnitInterval(item["confidence"]);
    if (confidence === undefined) return fail(`confidence for ${candidateId} must be between 0 and 1`);

    const reachability = oneOf(item["reachability"], REACHABILITY);
    if (!reachability) return fail(`reachability for ${candidateId} is not a recognised value`);

    const rationale = asString(item["rationale"]);
    if (!rationale) return fail(`rationale for ${candidateId} is required`);

    const resolvedAlgorithm = asString(item["resolved_algorithm"], 120);
    const rawKeySize = item["resolved_key_size"];
    const resolvedKeySize =
      typeof rawKeySize === "number" && Number.isFinite(rawKeySize) && rawKeySize > 0
        ? Math.round(rawKeySize)
        : undefined;

    verdicts.push({
      candidateId,
      status,
      confidence,
      reachability,
      ...(resolvedAlgorithm ? { resolvedAlgorithm } : {}),
      ...(resolvedKeySize ? { resolvedKeySize } : {}),
      rationale,
    });
  }

  const missing = [...known].filter((id) => !seen.has(id));
  if (missing.length > 0) {
    return fail(`missing verdicts for: ${missing.slice(0, 5).join(", ")}`);
  }

  return { ok: true, value: verdicts };
}

/** Applies a verdict's resolved algorithm back onto the candidate. */
export function applyResolution(candidate: Candidate, verdict: SentinelVerdict): Candidate {
  if (!verdict.resolvedAlgorithm && !verdict.resolvedKeySize) return candidate;

  const algorithm = verdict.resolvedAlgorithm ?? candidate.algorithm;
  const parameters = {
    ...candidate.parameters,
    ...(verdict.resolvedKeySize ? { keySize: verdict.resolvedKeySize } : {}),
  };

  return {
    ...candidate,
    algorithm,
    parameters,
    quantum: assessQuantumVulnerability(algorithm, {
      ...(parameters.keySize !== undefined ? { keySize: parameters.keySize } : {}),
    }),
  };
}
