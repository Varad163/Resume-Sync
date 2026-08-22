/**
 * ATLAS — the inventory narrative.
 *
 * The CBOM itself is assembled deterministically in @ironbastion/cbom; nothing
 * about turning findings into CycloneDX components needs judgement. What does
 * need judgement is the reading of it: which assets matter, what the estate's
 * shape says, and what an engineering leader should take away. That is all
 * ATLAS produces, and it is grounded in the assembled inventory rather than
 * writing over it.
 */

import type Anthropic from "@anthropic-ai/sdk";
import type { CycloneDxBom } from "@ironbastion/cbom";
import { MODELS, type ModelClient } from "./client.js";
import type { Budget } from "./budget.js";
import { runAgent, type AgentRunResult } from "./runtime.js";
import type { ToolContext } from "./tools.js";
import { asArray, asRecord, asString, fail, type Validated } from "./validate.js";

export const ATLAS_PROMPT_VERSION = "atlas/2026-08-22.1";

export interface InventorySummary {
  readonly summary: string;
  readonly observations: string[];
}

const SYSTEM = `You are ATLAS, the cryptographic inventory agent of the IronBastion platform.

You are given an assembled Cryptographic Bill of Materials. Write the reading of it for an engineering leader who has thirty seconds.

The summary is two to four sentences: what this estate runs on, where the quantum-vulnerable weight sits, and the single most important structural fact — a shared library everything depends on, one module carrying most of the exposure, a legacy algorithm still in a live path.

Then give three to six observations. Each one must be a specific, checkable statement about this inventory, not a generality about post-quantum cryptography. "Nine of eleven assets are quantum-vulnerable, and all nine sit behind the same Bouncy Castle provider version" is an observation. "Organisations should prepare for Q-Day" is not.

Describe only what is in the inventory. Do not estimate effort, assign severities, or recommend algorithms — other agents own those.

Call submit_summary exactly once.`;

const SUBMIT_TOOL: Anthropic.Tool = {
  name: "submit_summary",
  description: "Submit the inventory summary and observations.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      summary: { type: "string" },
      observations: { type: "array", items: { type: "string" } },
    },
    required: ["summary", "observations"],
    additionalProperties: false,
  },
};

export interface AtlasInput {
  readonly bom: CycloneDxBom;
  readonly client: ModelClient;
  readonly budget: Budget;
  readonly toolContext: ToolContext;
  readonly log?: (message: string) => void;
}

export async function summariseInventory(
  input: AtlasInput,
): Promise<AgentRunResult<InventorySummary>> {
  return runAgent<InventorySummary>({
    agentId: "atlas",
    phase: "PLAN",
    promptVersion: ATLAS_PROMPT_VERSION,
    model: MODELS.reasoning,
    effort: "medium",
    system: SYSTEM,
    task: buildTask(input.bom),
    submitTool: SUBMIT_TOOL,
    toolContext: input.toolContext,
    budget: input.budget,
    client: input.client,
    maxTurns: 4,
    ...(input.log ? { log: input.log } : {}),
    validate: validateSummary,
  });
}

function buildTask(bom: CycloneDxBom): string {
  const rows = bom.components
    .map((component) => {
      const properties = Object.fromEntries(
        (component.properties ?? []).map((p) => [p.name, p.value]),
      );
      const algorithm = component.cryptoProperties.algorithmProperties;
      return [
        `- ${component.name} (${component["bom-ref"]})`,
        `  primitive: ${algorithm?.primitive ?? component.cryptoProperties.assetType}`,
        `  nist post-quantum level: ${algorithm?.nistQuantumSecurityLevel ?? "n/a"}`,
        `  quantum: ${properties["ironbastion:quantum"] ?? "unknown"}`,
        `  severity: ${properties["ironbastion:severity"] ?? "unknown"} (risk ${properties["ironbastion:risk-score"] ?? "?"})`,
        `  occurrences: ${properties["ironbastion:occurrences"] ?? "0"} in ${properties["ironbastion:components"] ?? "unknown"}`,
      ].join("\n");
    })
    .join("\n\n");

  return `Cryptographic Bill of Materials for ${bom.metadata.component.name}, ${bom.components.length} asset(s):

${rows || "(no cryptographic assets were found)"}

Write the summary.`;
}

export function validateSummary(raw: unknown): Validated<InventorySummary> {
  const record = asRecord(raw);
  const summary = asString(record?.["summary"]);
  if (!summary) return fail("summary is required");

  const observations = (asArray(record?.["observations"]) ?? [])
    .map((value) => asString(value, 600))
    .filter((value): value is string => !!value);

  if (observations.length === 0) return fail("at least one observation is required");
  return { ok: true, value: { summary, observations } };
}
