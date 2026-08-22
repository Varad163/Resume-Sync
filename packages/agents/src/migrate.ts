/**
 * MIGRATE — the plan.
 *
 * The agent sequences the work: what moves first, what it depends on, how it is
 * validated, and which national milestone each wave is aimed at. What it may
 * *not* do is choose the cryptography. Target algorithms are checked against the
 * registry's sanctioned replacement for the algorithm being replaced, and a plan
 * that proposes anything else is rejected and sent back with the allowed value.
 *
 * That division is the point: sequencing is judgement, algorithm selection is
 * standards compliance.
 */

import type Anthropic from "@anthropic-ai/sdk";
import {
  MILESTONES,
  algorithmById,
  pqcReplacementFor,
  type EffortSize,
  type Finding,
  type MigrationApproach,
} from "@ironbastion/core";
import { MODELS, type ModelClient } from "./client.js";
import type { Budget } from "./budget.js";
import { runAgent, type AgentRunResult } from "./runtime.js";
import type { ToolContext } from "./tools.js";
import { asArray, asRecord, asString, fail, oneOf, type Validated } from "./validate.js";

export const MIGRATE_PROMPT_VERSION = "migrate/2026-08-22.1";

const APPROACHES: readonly MigrationApproach[] = [
  "drop-in",
  "parameter-change",
  "hybrid",
  "protocol-upgrade",
  "re-architect",
  "vendor-dependency",
];

const EFFORTS: readonly EffortSize[] = ["S", "M", "L", "XL"];
const MILESTONE_IDS = MILESTONES.map((m) => m.id);

export interface PlannedAction {
  readonly findingIds: string[];
  readonly component: string;
  readonly currentAlgorithm: string;
  readonly targetAlgorithm: string;
  readonly approach: MigrationApproach;
  readonly effort: EffortSize;
  readonly rationale: string;
  readonly dependsOn: string[];
  readonly risks: string[];
  readonly validation: string[];
  readonly id: string;
}

export interface PlannedWave {
  readonly id: string;
  readonly name: string;
  readonly rationale: string;
  readonly milestoneId: string;
  readonly actions: PlannedAction[];
}

export interface PlanSubmission {
  readonly summary: string;
  readonly waves: PlannedWave[];
  readonly milestoneRisks: { milestoneId: string; atRisk: boolean; reason: string }[];
}

const SYSTEM = `You are MIGRATE, the post-quantum migration planning agent of the IronBastion platform.

You are given confirmed cryptographic findings with risk scores, and you produce a migration plan: ordered waves of concrete actions.

How to sequence:
- Wave order follows exposure and data lifetime, not convenience. Externally reachable key establishment protecting long-lived data moves first, because that traffic is being recorded now.
- A dependency that blocks the standardised algorithms — an old provider version, a library that pins an algorithm — must be scheduled before anything that depends on it. Say so with depends_on.
- Certificates and protocols depend on parties you do not control. Schedule the negotiation early even when the code change is late.
- Group findings that are genuinely one piece of work into one action. Do not emit one action per line of code.
- Aim each wave at one of the public milestones you are given.

Effort sizes: S is about two days, M about eight, L about twenty-five, XL about sixty. Judge from the approach and the number of call sites, and be honest — a plan nobody can staff is not a plan.

Approaches:
- "drop-in": swap the algorithm behind an existing interface.
- "parameter-change": same algorithm, stronger parameters. Raising AES-128 to AES-256 is this.
- "hybrid": classical and post-quantum together, so the session is safe if either holds. The standard first step for key establishment.
- "protocol-upgrade": requires a protocol version or suite change, and agreement from peers.
- "re-architect": the design has to change — data re-encryption, key hierarchy changes, format changes.
- "vendor-dependency": you cannot fix it; a supplier must ship something first.

Constraints you must obey:
- The target algorithm for each action is dictated by standards, not chosen by you. Each finding below states its sanctioned replacement. Use exactly that string. If a finding is already quantum-safe, do not write an action for it.
- Every action must reference at least one finding id from the list.
- Every risk you list must be a real consequence of the change, and every validation must be something an engineer can actually run.

Finally, state which milestones this estate is at risk of missing, and why, based on the total effort and the sequencing you produced.

Call submit_plan exactly once.`;

const SUBMIT_TOOL: Anthropic.Tool = {
  name: "submit_plan",
  description: "Submit the migration plan.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      summary: {
        type: "string",
        description: "Two to four sentences an executive can act on: the position, what moves first, and the deadline that binds.",
      },
      waves: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string", description: "Short slug, e.g. 'wave-1'." },
            name: { type: "string" },
            rationale: { type: "string", description: "Why this work, in this order, now." },
            milestone_id: { type: "string", enum: MILESTONE_IDS },
            actions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string", description: "Short slug, unique across the plan." },
                  finding_ids: { type: "array", items: { type: "string" } },
                  component: { type: "string" },
                  current_algorithm: { type: "string" },
                  target_algorithm: { type: "string", description: "Exactly the sanctioned replacement given for the finding." },
                  approach: { type: "string", enum: [...APPROACHES] },
                  effort: { type: "string", enum: [...EFFORTS] },
                  rationale: { type: "string" },
                  depends_on: { type: "array", items: { type: "string" }, description: "Ids of actions that must land first." },
                  risks: { type: "array", items: { type: "string" } },
                  validation: { type: "array", items: { type: "string" } },
                },
                required: [
                  "id",
                  "finding_ids",
                  "component",
                  "current_algorithm",
                  "target_algorithm",
                  "approach",
                  "effort",
                  "rationale",
                  "depends_on",
                  "risks",
                  "validation",
                ],
                additionalProperties: false,
              },
            },
          },
          required: ["id", "name", "rationale", "milestone_id", "actions"],
          additionalProperties: false,
        },
      },
      milestone_risks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            milestone_id: { type: "string", enum: MILESTONE_IDS },
            at_risk: { type: "boolean" },
            reason: { type: "string" },
          },
          required: ["milestone_id", "at_risk", "reason"],
          additionalProperties: false,
        },
      },
    },
    required: ["summary", "waves", "milestone_risks"],
    additionalProperties: false,
  },
};

export interface MigrateInput {
  readonly findings: readonly Finding[];
  readonly client: ModelClient;
  readonly budget: Budget;
  readonly toolContext: ToolContext;
  readonly log?: (message: string) => void;
}

export async function planMigration(input: MigrateInput): Promise<AgentRunResult<PlanSubmission>> {
  const sanctioned = sanctionedReplacements(input.findings);
  const known = new Set(input.findings.map((f) => f.id));

  return runAgent<PlanSubmission>({
    agentId: "migrate",
    model: MODELS.reasoning,
    effort: "high",
    system: SYSTEM,
    task: buildTask(input.findings, sanctioned),
    submitTool: SUBMIT_TOOL,
    toolContext: input.toolContext,
    budget: input.budget,
    client: input.client,
    maxTokens: 24_000,
    ...(input.log ? { log: input.log } : {}),
    validate: (raw) => validatePlan(raw, known, sanctioned),
  });
}

/** The replacement standards dictate for each finding, keyed by finding id. */
export function sanctionedReplacements(findings: readonly Finding[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const finding of findings) {
    const replacement = pqcReplacementFor(finding.algorithm, {
      ...(finding.parameters.keySize !== undefined ? { keySize: finding.parameters.keySize } : {}),
    });
    if (replacement) map.set(finding.id, replacement);
  }
  return map;
}

function buildTask(findings: readonly Finding[], sanctioned: Map<string, string>): string {
  const rows = findings
    .filter((finding) => sanctioned.has(finding.id))
    .sort((a, b) => b.risk.score - a.risk.score)
    .map((finding) => {
      const entry = algorithmById(finding.algorithm);
      return [
        `- finding_id: ${finding.id}`,
        `  component: ${finding.component}`,
        `  algorithm: ${finding.algorithm}${finding.parameters.keySize ? `-${finding.parameters.keySize}` : ""}${finding.parameters.curve ? ` (${finding.parameters.curve})` : ""}`,
        `  primitive: ${finding.primitive}${entry?.reference ? `, specified in ${entry.reference}` : ""}`,
        `  sanctioned replacement: ${sanctioned.get(finding.id)}`,
        `  risk: ${finding.risk.score} (${finding.risk.severity})`,
        `  reachability: ${finding.adjudication.reachability}, exposure: ${finding.adjudication.exposure}, data lifetime: ${finding.adjudication.dataLifetime}`,
        `  location: ${finding.provenance.evidence[0]?.locator ?? "unknown"}`,
        `  note: ${finding.title}`,
      ].join("\n");
    })
    .join("\n\n");

  const milestones = MILESTONES.map(
    (m) => `- ${m.id} (${m.year}): ${m.title}. ${m.expectation} [${m.source}]`,
  ).join("\n");

  return `Public milestones this plan is measured against:

${milestones}

Confirmed findings that require migration:

${rows}

Produce the plan.`;
}

export function validatePlan(
  raw: unknown,
  knownFindings: ReadonlySet<string>,
  sanctioned: ReadonlyMap<string, string>,
): Validated<PlanSubmission> {
  const record = asRecord(raw);
  if (!record) return fail("expected an object");

  const summary = asString(record["summary"]);
  if (!summary) return fail("summary is required");

  const waveEntries = asArray(record["waves"]);
  if (!waveEntries || waveEntries.length === 0) return fail("at least one wave is required");

  const waves: PlannedWave[] = [];
  const actionIds = new Set<string>();

  for (const waveEntry of waveEntries) {
    const wave = asRecord(waveEntry);
    if (!wave) return fail("each wave must be an object");

    const id = asString(wave["id"], 60);
    const name = asString(wave["name"], 200);
    const rationale = asString(wave["rationale"]);
    const milestoneId = oneOf(wave["milestone_id"], MILESTONE_IDS);
    if (!id || !name || !rationale) return fail("each wave needs an id, a name and a rationale");
    if (!milestoneId) return fail(`wave ${id} must target one of: ${MILESTONE_IDS.join(", ")}`);

    const actionEntries = asArray(wave["actions"]) ?? [];
    const actions: PlannedAction[] = [];

    for (const actionEntry of actionEntries) {
      const action = asRecord(actionEntry);
      if (!action) return fail(`each action in ${id} must be an object`);

      const actionId = asString(action["id"], 60);
      if (!actionId) return fail(`an action in ${id} is missing an id`);
      if (actionIds.has(actionId)) return fail(`duplicate action id ${actionId}`);
      actionIds.add(actionId);

      const findingIds = (asArray(action["finding_ids"]) ?? [])
        .map((value) => asString(value, 200))
        .filter((value): value is string => !!value);
      if (findingIds.length === 0) return fail(`action ${actionId} must reference at least one finding_id`);

      const unknown = findingIds.filter((findingId) => !knownFindings.has(findingId));
      if (unknown.length > 0) {
        return fail(`action ${actionId} references unknown finding_id(s): ${unknown.join(", ")}`);
      }

      const target = asString(action["target_algorithm"], 120);
      if (!target) return fail(`action ${actionId} needs a target_algorithm`);

      // The guardrail: standards choose the algorithm, not the model.
      const required = sanctioned.get(findingIds[0]!);
      if (required && target.toUpperCase() !== required.toUpperCase()) {
        return fail(
          `action ${actionId} proposes ${target} for ${findingIds[0]}, but the sanctioned replacement is ${required}. Use exactly that.`,
        );
      }

      const approach = oneOf(action["approach"], APPROACHES);
      if (!approach) return fail(`action ${actionId} has an unrecognised approach`);

      const effort = oneOf(action["effort"], EFFORTS);
      if (!effort) return fail(`action ${actionId} must size effort as S, M, L or XL`);

      const component = asString(action["component"], 200);
      const currentAlgorithm = asString(action["current_algorithm"], 120);
      const actionRationale = asString(action["rationale"]);
      if (!component || !currentAlgorithm || !actionRationale) {
        return fail(`action ${actionId} needs component, current_algorithm and rationale`);
      }

      actions.push({
        id: actionId,
        findingIds,
        component,
        currentAlgorithm,
        targetAlgorithm: required ?? target,
        approach,
        effort,
        rationale: actionRationale,
        dependsOn: (asArray(action["depends_on"]) ?? [])
          .map((value) => asString(value, 60))
          .filter((value): value is string => !!value),
        risks: (asArray(action["risks"]) ?? [])
          .map((value) => asString(value, 500))
          .filter((value): value is string => !!value),
        validation: (asArray(action["validation"]) ?? [])
          .map((value) => asString(value, 500))
          .filter((value): value is string => !!value),
      });
    }

    waves.push({ id, name, rationale, milestoneId, actions });
  }

  // Dependencies must resolve inside the plan, or the sequencing is fiction.
  for (const wave of waves) {
    for (const action of wave.actions) {
      const dangling = action.dependsOn.filter((dependency) => !actionIds.has(dependency));
      if (dangling.length > 0) {
        return fail(`action ${action.id} depends on unknown action(s): ${dangling.join(", ")}`);
      }
    }
  }

  const milestoneRisks = (asArray(record["milestone_risks"]) ?? [])
    .map((entry) => {
      const item = asRecord(entry);
      const milestoneId = oneOf(item?.["milestone_id"], MILESTONE_IDS);
      const reason = asString(item?.["reason"]);
      if (!milestoneId || !reason) return undefined;
      return { milestoneId, atRisk: item?.["at_risk"] === true, reason };
    })
    .filter((entry): entry is { milestoneId: string; atRisk: boolean; reason: string } => !!entry);

  return { ok: true, value: { summary, waves, milestoneRisks } };
}
