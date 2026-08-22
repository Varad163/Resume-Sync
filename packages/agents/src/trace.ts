/**
 * Agent execution traces.
 *
 * A security product that says "an agent judged this" owes the reader an
 * answer to "how?". A trace records every turn an agent took, every tool call
 * it made and what came back, the tokens it spent, and the decision it reached
 * — so a finding can be re-examined months later by someone who was not there.
 *
 * Traces are recorded for real model runs and for the rule-based path alike.
 * The difference is visible in `model`, never hidden.
 */

export type AgentId = "sentinel" | "oracle" | "atlas" | "migrate";

export interface ToolCallTrace {
  readonly turn: number;
  readonly tool: string;
  /** Arguments as the agent supplied them, truncated for storage. */
  readonly input: Record<string, unknown>;
  /** First lines of what the tool returned. */
  readonly resultPreview: string;
  readonly resultBytes: number;
  readonly failed: boolean;
  readonly durationMs: number;
}

export interface TurnTrace {
  readonly turn: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly stopReason: string | null;
  /** What the agent said out loud on this turn, if anything. */
  readonly text: string;
  readonly toolNames: readonly string[];
  /** Set when a submission was rejected and handed back for correction. */
  readonly rejection?: string;
}

export interface AgentTrace {
  readonly agentId: string;
  readonly phase: string;
  readonly model: string;
  readonly promptVersion: string;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly durationMs: number;
  readonly turns: readonly TurnTrace[];
  readonly toolCalls: readonly ToolCallTrace[];
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly costCents: number;
  /** One line per decision: what the agent concluded and why. */
  readonly decisions: readonly AgentDecision[];
  readonly status: "succeeded" | "failed" | "skipped";
  readonly error?: string;
  /** What this agent was asked to do, in the product's own words. */
  readonly task: string;
}

export interface AgentDecision {
  readonly subject: string;
  readonly outcome: string;
  readonly confidence?: number;
  readonly rationale: string;
}

const MAX_PREVIEW = 400;
const MAX_TEXT = 2000;

export function preview(text: string, limit = MAX_PREVIEW): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > limit ? `${clean.slice(0, limit)}…` : clean;
}

/** Accumulates a trace while an agent runs. */
export class TraceRecorder {
  readonly #turns: TurnTrace[] = [];
  readonly #toolCalls: ToolCallTrace[] = [];
  readonly #decisions: AgentDecision[] = [];
  readonly #startedAt = Date.now();

  constructor(
    private readonly agentId: string,
    private readonly phase: string,
    private readonly promptVersion: string,
    private readonly task: string,
  ) {}

  recordTurn(turn: Omit<TurnTrace, "text"> & { text: string }): void {
    this.#turns.push({ ...turn, text: preview(turn.text, MAX_TEXT) });
  }

  recordToolCall(call: Omit<ToolCallTrace, "resultPreview"> & { result: string }): void {
    const { result, ...rest } = call;
    this.#toolCalls.push({ ...rest, resultPreview: preview(result) });
  }

  recordDecision(decision: AgentDecision): void {
    this.#decisions.push({ ...decision, rationale: preview(decision.rationale, 600) });
  }

  finish(input: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    costCents: number;
    status: AgentTrace["status"];
    error?: string;
  }): AgentTrace {
    const finishedAt = Date.now();
    return {
      agentId: this.agentId,
      phase: this.phase,
      model: input.model,
      promptVersion: this.promptVersion,
      startedAt: new Date(this.#startedAt).toISOString(),
      finishedAt: new Date(finishedAt).toISOString(),
      durationMs: finishedAt - this.#startedAt,
      turns: this.#turns,
      toolCalls: this.#toolCalls,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      costCents: Math.round(input.costCents * 100) / 100,
      decisions: this.#decisions,
      status: input.status,
      ...(input.error ? { error: input.error } : {}),
      task: preview(this.task, 600),
    };
  }
}

/** Attaches the decisions an agent reached, once the caller has interpreted them. */
export function withDecisions(
  trace: AgentTrace,
  decisions: readonly AgentDecision[],
): AgentTrace {
  return {
    ...trace,
    decisions: decisions.map((decision) => ({
      ...decision,
      rationale: preview(decision.rationale, 600),
    })),
  };
}

/** A trace for work done by rules rather than by a model. */
export function ruleTrace(input: {
  agentId: string;
  phase: string;
  task: string;
  decisions: readonly AgentDecision[];
  durationMs: number;
}): AgentTrace {
  const now = new Date().toISOString();
  return {
    agentId: input.agentId,
    phase: input.phase,
    model: "deterministic-rules/1.0",
    promptVersion: "rules/1.0",
    startedAt: now,
    finishedAt: now,
    durationMs: input.durationMs,
    turns: [],
    toolCalls: [],
    inputTokens: 0,
    outputTokens: 0,
    costCents: 0,
    decisions: input.decisions.map((decision) => ({
      ...decision,
      rationale: preview(decision.rationale, 600),
    })),
    status: "succeeded",
    task: preview(input.task, 600),
  };
}
