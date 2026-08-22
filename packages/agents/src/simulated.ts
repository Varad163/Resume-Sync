/**
 * A simulated model transport.
 *
 * This is NOT a model, and it does not pretend to be one: every response it
 * produces is stamped `simulated-agent/1.0`, which surfaces in the console and
 * in the report exactly as the rule-based fallback does.
 *
 * What it is for: exercising the real agent machinery when no credential is
 * configured. The agent loop, the read-only tool surface, the schema validation,
 * the rejection-and-retry path and the trace recorder all run for real — the
 * only thing replaced is the reasoning. So the internals are visible and
 * testable on a laptop, and the day a key is added the same code path carries
 * genuine Claude responses with nothing to change.
 */

import type Anthropic from "@anthropic-ai/sdk";
import type { ModelClient, ModelRequest, ModelResponse } from "./client.js";

export const SIMULATED_MODEL = "simulated-agent/1.0";

interface Plan {
  /** Investigation the simulated agent performs before concluding. */
  readonly investigate: (request: ModelRequest) => Anthropic.ContentBlock[] | undefined;
  readonly submit: (request: ModelRequest) => Anthropic.ContentBlock[];
}

export function createSimulatedClient(): ModelClient {
  const investigated = new Set<string>();

  return {
    id: SIMULATED_MODEL,
    async complete(request: ModelRequest): Promise<ModelResponse> {
      const submitTool = request.tools.at(-1)!;
      const plan = planFor(submitTool.name);
      const key = `${submitTool.name}:${request.messages[0]?.content?.toString().slice(0, 60)}`;

      // One investigation pass, then conclude — the shape a real agent takes.
      if (!investigated.has(key)) {
        investigated.add(key);
        const investigation = plan.investigate(request);
        if (investigation) {
          return respond(investigation, "tool_use", request);
        }
      }

      return respond(plan.submit(request), "tool_use", request);
    },
  };
}

function respond(
  content: Anthropic.ContentBlock[],
  stopReason: string,
  request: ModelRequest,
): ModelResponse {
  // Token counts are proportional to the real payload, so budget accounting and
  // the cost column behave the way they will with a live model.
  const promptChars = request.system.length + JSON.stringify(request.messages).length;
  const outputChars = JSON.stringify(content).length;
  return {
    content,
    stopReason,
    model: SIMULATED_MODEL,
    usage: {
      inputTokens: Math.ceil(promptChars / 4),
      outputTokens: Math.ceil(outputChars / 4),
      cacheReadTokens: 0,
    },
  };
}

const toolUse = (name: string, input: unknown, id: string): Anthropic.ContentBlock =>
  ({ type: "tool_use", id, name, input }) as Anthropic.ContentBlock;

const text = (value: string): Anthropic.ContentBlock =>
  ({ type: "text", text: value, citations: [] }) as unknown as Anthropic.ContentBlock;

function planFor(submitToolName: string): Plan {
  switch (submitToolName) {
    case "submit_verdicts":
      return {
        investigate: (request) => {
          const first = firstLocator(request);
          if (!first) return undefined;
          return [
            text("Reading the call site before deciding whether this is reachable."),
            toolUse("read_file", { path: first, start_line: 1, end_line: 60 }, "sim_read"),
          ];
        },
        submit: (request) => [
          text("Adjudicated each candidate from its rule, location and excerpt."),
          toolUse(
            "submit_verdicts",
            { verdicts: candidateBlocks(request).map(verdictFor) },
            "sim_submit",
          ),
        ],
      };

    case "submit_assessments":
      return {
        investigate: (request) => {
          const first = firstLocator(request);
          if (!first) return undefined;
          return [
            text("Searching for retention and exposure evidence around the component."),
            toolUse(
              "search_repository",
              { pattern: "retention|expiry|public|controller|endpoint", glob: "**/*.{java,xml,yml,properties}" },
              "sim_search",
            ),
          ];
        },
        submit: (request) => [
          text("Assessed data lifetime and exposure per finding."),
          toolUse(
            "submit_assessments",
            { assessments: candidateBlocks(request).map(assessmentFor) },
            "sim_submit",
          ),
        ],
      };

    case "submit_summary":
      return {
        investigate: () => undefined,
        submit: (request) => {
          const assets = countMatches(request, /^- /gm);
          return [
            toolUse(
              "submit_summary",
              {
                summary: `Simulated inventory reading: ${assets} cryptographic asset(s) were inventoried. The quantum-vulnerable weight sits in asymmetric key establishment and signature, which is where migration has to start.`,
                observations: [
                  "Asymmetric key establishment and signature carry NIST post-quantum level 0 and are the first wave.",
                  "Symmetric cryptography at 256-bit parameters is already quantum-safe and needs no action.",
                  "Legacy digests and ciphers in the inventory are broken classically, not only by quantum attack.",
                ],
              },
              "sim_submit",
            ),
          ];
        },
      };

    case "submit_plan":
      return {
        investigate: () => undefined,
        submit: (request) => [
          text("Sequenced the work by exposure and data lifetime."),
          toolUse("submit_plan", simulatedPlan(request), "sim_submit"),
        ],
      };

    default:
      return {
        investigate: () => undefined,
        submit: () => [text("No simulation is defined for this agent.")],
      };
  }
}

// ---------------------------------------------------------------- extraction

function taskText(request: ModelRequest): string {
  const first = request.messages[0];
  return typeof first?.content === "string" ? first.content : JSON.stringify(first?.content ?? "");
}

export interface CandidateBlock {
  readonly id: string;
  readonly algorithm: string;
  readonly location: string;
  readonly flagged: string;
  readonly component: string;
}

/**
 * The metadata each candidate was presented with. The simulation reasons from
 * this rather than answering identically for everything — an agent that
 * confirms a runtime-selected algorithm it never resolved is not a useful
 * demonstration of what an agent does.
 */
function candidateBlocks(request: ModelRequest): CandidateBlock[] {
  const task = taskText(request);
  const blocks = task.split(/\n(?=- candidate_id: )/).filter((block) => block.includes("candidate_id:"));
  return blocks.map((block) => ({
    id: /candidate_id: (\S+)/.exec(block)?.[1] ?? "",
    algorithm: /algorithm(?: as detected)?: (\S+)/.exec(block)?.[1] ?? "",
    location: /location: (\S+)/.exec(block)?.[1] ?? "",
    flagged: /flagged: (.+)/.exec(block)?.[1] ?? "",
    component: /component: (.+)/.exec(block)?.[1]?.trim() ?? "",
  }));
}

function firstLocator(request: ModelRequest): string | undefined {
  const match = /location: ([^\s:]+\.(?:java|kt|xml|gradle))/.exec(taskText(request));
  return match?.[1];
}

function countMatches(request: ModelRequest, pattern: RegExp): number {
  return [...taskText(request).matchAll(pattern)].length;
}

// ------------------------------------------------------------------ verdicts

function verdictFor(block: CandidateBlock): Record<string, unknown> {
  const unresolved = block.algorithm === "UNRESOLVED" || block.flagged.includes("indirect-algorithm");
  const inTests = /(^|\/)(src\/test|tests?)\//.test(block.location) || block.flagged.includes("test-scope");
  const fromDependency = block.location.endsWith("pom.xml") || block.location.includes("build.gradle");

  if (unresolved) {
    return {
      candidate_id: block.id,
      status: "needs-human",
      confidence: 0.35,
      reachability: "unknown",
      rationale: `Simulated adjudication: the algorithm at ${block.location} is selected at runtime, and the configured value could not be established from the sources read. A person should confirm which transformation is deployed.`,
    };
  }

  if (inTests) {
    return {
      candidate_id: block.id,
      status: "confirmed",
      confidence: 0.8,
      reachability: "test-only",
      rationale: `Simulated adjudication: ${block.algorithm} is real, but ${block.location} sits under test sources and nothing in production reaches it.`,
    };
  }

  return {
    candidate_id: block.id,
    status: "confirmed",
    confidence: 0.82,
    reachability: fromDependency ? "unknown" : "runtime",
    rationale: fromDependency
      ? `Simulated adjudication: ${block.algorithm} is declared as a dependency in ${block.location}; whether it is reached at runtime depends on which code paths execute.`
      : `Simulated adjudication: ${block.algorithm} is named literally at ${block.location}, which sits under production sources and is reachable from the component's public methods.`,
  };
}

function assessmentFor(block: CandidateBlock): Record<string, unknown> {
  const haystack = `${block.component} ${block.location}`;
  const longLived = /token|card|payment|settle|ledger|vault|identity/i.test(haystack);
  const edge = /gateway|transport|client|api|controller/i.test(haystack);
  const inTests = /(^|\/)(src\/test|tests?)\//.test(block.location);

  if (inTests) {
    return {
      candidate_id: block.id,
      data_lifetime: "ephemeral",
      exposure: "isolated",
      confidence: 0.75,
      rationale: `Simulated impact assessment: ${block.location} is a test fixture; the values it protects exist for the duration of the test run.`,
    };
  }

  return {
    candidate_id: block.id,
    data_lifetime: longLived ? "long" : "medium",
    exposure: edge ? "external" : "internal",
    confidence: 0.7,
    rationale: longLived
      ? `Simulated impact assessment: ${block.component} handles payment or identity data, whose confidentiality outlives the cryptography protecting it — traffic recorded today is still sensitive when the algorithm falls.`
      : `Simulated impact assessment: ${block.component} handles business records with a defined retention rather than indefinitely sensitive data.`,
  };
}

function simulatedPlan(request: ModelRequest): Record<string, unknown> {
  const task = taskText(request);
  const findings = [...task.matchAll(/finding_id: (\S+)[\s\S]*?sanctioned replacement: (\S+)/g)].map(
    (match) => ({ id: match[1]!, target: match[2]! }),
  );

  const actions = findings.slice(0, 12).map((finding, index) => ({
    id: `action-${index + 1}`,
    finding_ids: [finding.id],
    component: componentFor(task, finding.id) ?? "unknown",
    current_algorithm: algorithmFor(task, finding.id) ?? "unknown",
    target_algorithm: finding.target,
    approach: approachFor(finding.target),
    effort: index < 3 ? "L" : "M",
    rationale:
      "Simulated sequencing: scheduled by computed risk score, highest exposure first, so recorded traffic stops accumulating soonest.",
    depends_on: [],
    risks: ["Wire or storage format changes and requires coordinated rollout."],
    validation: ["Re-scan the component and confirm the algorithm no longer appears."],
  }));

  const split = Math.ceil(actions.length / 2);
  const waves = [
    actions.length > 0
      ? {
          id: "wave-1",
          name: "Externally exposed key establishment",
          rationale:
            "Simulated plan: traffic protected by these keys can be recorded today and decrypted later, so it moves first.",
          milestone_id: "high-priority-2028",
          actions: actions.slice(0, split),
        }
      : undefined,
    actions.length > split
      ? {
          id: "wave-2",
          name: "Remaining quantum-vulnerable cryptography",
          rationale: "Simulated plan: everything else, ahead of the 2035 prohibition.",
          milestone_id: "disallowed-2035",
          actions: actions.slice(split),
        }
      : undefined,
  ].filter(Boolean);

  return {
    summary: `Simulated migration plan across ${actions.length} action(s), sequenced by exposure and data lifetime. Not a model-produced plan.`,
    waves,
    milestone_risks: [
      {
        milestone_id: "deprecation-2030",
        at_risk: actions.length > 6,
        reason: "Simulated judgement based on the number of distinct components requiring change.",
      },
    ],
  };
}

function componentFor(task: string, findingId: string): string | undefined {
  const match = new RegExp(`finding_id: ${findingId}\\n\\s+component: (.+)`).exec(task);
  return match?.[1]?.trim();
}

function algorithmFor(task: string, findingId: string): string | undefined {
  const match = new RegExp(`finding_id: ${findingId}[\\s\\S]*?algorithm: (\\S+)`).exec(task);
  return match?.[1]?.replace(/-\d+$/, "").trim();
}

function approachFor(target: string): string {
  if (target.startsWith("ML-KEM")) return "hybrid";
  if (target.startsWith("ML-DSA")) return "drop-in";
  if (target.startsWith("TLS")) return "protocol-upgrade";
  if (target.startsWith("AES")) return "parameter-change";
  return "drop-in";
}
