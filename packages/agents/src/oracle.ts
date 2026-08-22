/**
 * ORACLE — what the cryptography actually protects.
 *
 * SENTINEL establishes identity. ORACLE establishes consequence: how long the
 * protected data stays sensitive, and how exposed the component is. These are
 * the two evidence slots the risk formula cannot derive from source, and they
 * are the difference between "RSA is used here" and "recorded traffic from this
 * endpoint is readable in 2035".
 *
 * ORACLE never returns a score. It returns evidence; the scoring function in
 * @ironbastion/risk turns evidence into a number, identically every time.
 */

import type Anthropic from "@anthropic-ai/sdk";
import type { Candidate, DataLifetime } from "@ironbastion/core";
import { MODELS, type ModelClient } from "./client.js";
import type { Budget } from "./budget.js";
import { runAgent, type AgentRunResult } from "./runtime.js";
import type { ToolContext } from "./tools.js";
import { asArray, asRecord, asString, asUnitInterval, fail, oneOf, type Validated } from "./validate.js";

export const ORACLE_PROMPT_VERSION = "oracle/2026-08-22.1";

const LIFETIMES: readonly DataLifetime[] = [
  "ephemeral",
  "short",
  "medium",
  "long",
  "indefinite",
  "unknown",
];

const EXPOSURES = ["external", "internal", "isolated", "unknown"] as const;

export interface OracleAssessment {
  readonly candidateId: string;
  readonly dataLifetime: DataLifetime;
  readonly exposure: (typeof EXPOSURES)[number];
  readonly confidence: number;
  readonly rationale: string;
}

const SYSTEM = `You are ORACLE, the quantum risk assessment agent of the IronBastion platform.

For each confirmed cryptographic finding, establish two things, and only these two.

1. DATA LIFETIME — how long the data this cryptography protects must stay confidential:
   - "ephemeral": seconds to hours. A session token, a nonce, a CSRF value.
   - "short": days to months. A cache entry, a short-lived credential.
   - "medium": one to five years. Business records with a defined retention.
   - "long": five to twenty-five years. Payment credentials, health records, contracts, identity documents.
   - "indefinite": beyond twenty-five years, or permanently. State secrets, genomic data, root key material, anything whose disclosure is never acceptable.
   - "unknown": you could not establish it.

   This is the harvest-now-decrypt-later axis. An adversary can record ciphertext today and decrypt it when the algorithm falls. So the question is not "is this data sensitive now" but "will its disclosure still matter after the cryptography is broken".

2. EXPOSURE — where the component sits:
   - "external": reachable from an untrusted network, directly or through a gateway.
   - "internal": reachable only inside the corporate or cluster network.
   - "isolated": air-gapped, or reachable only from an operator's workstation.
   - "unknown": you could not establish it.

Read the repository to answer. Class and package names, controller annotations, configuration files, database schemas, retention comments and API definitions are all evidence. Say what you read.

Where you cannot establish something, answer "unknown" rather than guessing. "Unknown" is weighted as uncertain, which is the honest treatment; a confident wrong answer corrupts the score.

Do not assign a risk score, a severity, or a priority. Those are computed from your evidence, not by you.

Call submit_assessments exactly once, with one entry per finding.`;

const SUBMIT_TOOL: Anthropic.Tool = {
  name: "submit_assessments",
  description: "Submit the data lifetime and exposure evidence for each finding.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      assessments: {
        type: "array",
        items: {
          type: "object",
          properties: {
            candidate_id: { type: "string" },
            data_lifetime: { type: "string", enum: [...LIFETIMES] },
            exposure: { type: "string", enum: [...EXPOSURES] },
            confidence: { type: "number", description: "0 to 1." },
            rationale: { type: "string", description: "The evidence you read, with files and lines." },
          },
          required: ["candidate_id", "data_lifetime", "exposure", "confidence", "rationale"],
          additionalProperties: false,
        },
      },
    },
    required: ["assessments"],
    additionalProperties: false,
  },
};

export interface OracleInput {
  readonly candidates: readonly Candidate[];
  readonly client: ModelClient;
  readonly budget: Budget;
  readonly toolContext: ToolContext;
  readonly log?: (message: string) => void;
}

export async function assessImpact(input: OracleInput): Promise<AgentRunResult<OracleAssessment[]>> {
  const known = new Set(input.candidates.map((c) => c.id));

  return runAgent<OracleAssessment[]>({
    agentId: "oracle",
    phase: "ANALYZE",
    promptVersion: ORACLE_PROMPT_VERSION,
    model: MODELS.reasoning,
    effort: "medium",
    system: SYSTEM,
    task: buildTask(input.candidates),
    submitTool: SUBMIT_TOOL,
    toolContext: input.toolContext,
    budget: input.budget,
    client: input.client,
    ...(input.log ? { log: input.log } : {}),
    validate: (raw) => validateAssessments(raw, known),
  });
}

function buildTask(candidates: readonly Candidate[]): string {
  const body = candidates
    .map((candidate) => {
      const evidence = candidate.provenance.evidence[0];
      return [
        `- candidate_id: ${candidate.id}`,
        `  algorithm: ${candidate.algorithm} ${JSON.stringify(candidate.parameters)}`,
        `  component: ${candidate.component}`,
        `  location: ${evidence?.locator ?? "unknown"}${evidence?.startLine ? `:${evidence.startLine}` : ""}`,
        `  what it does: ${candidate.description}`,
      ].join("\n");
    })
    .join("\n\n");

  return `Assess data lifetime and exposure for these ${candidates.length} confirmed finding(s):

${body}

Submit exactly ${candidates.length} assessment(s).`;
}

export function validateAssessments(
  raw: unknown,
  known: ReadonlySet<string>,
): Validated<OracleAssessment[]> {
  const record = asRecord(raw);
  const entries = asArray(record?.["assessments"]);
  if (!entries) return fail("expected an object with an `assessments` array");

  const assessments: OracleAssessment[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    const item = asRecord(entry);
    if (!item) return fail("each assessment must be an object");

    const candidateId = asString(item["candidate_id"], 200);
    if (!candidateId) return fail("every assessment needs a candidate_id");
    if (!known.has(candidateId)) return fail(`unknown candidate_id ${candidateId}`);
    if (seen.has(candidateId)) return fail(`duplicate assessment for ${candidateId}`);
    seen.add(candidateId);

    const dataLifetime = oneOf(item["data_lifetime"], LIFETIMES);
    if (!dataLifetime) return fail(`data_lifetime for ${candidateId} is not a recognised value`);

    const exposure = oneOf(item["exposure"], EXPOSURES);
    if (!exposure) return fail(`exposure for ${candidateId} is not a recognised value`);

    const confidence = asUnitInterval(item["confidence"]);
    if (confidence === undefined) return fail(`confidence for ${candidateId} must be between 0 and 1`);

    const rationale = asString(item["rationale"]);
    if (!rationale) return fail(`rationale for ${candidateId} is required`);

    assessments.push({ candidateId, dataLifetime, exposure, confidence, rationale });
  }

  const missing = [...known].filter((id) => !seen.has(id));
  if (missing.length > 0) return fail(`missing assessments for: ${missing.slice(0, 5).join(", ")}`);

  return { ok: true, value: assessments };
}
