/**
 * The agent loop.
 *
 * An agent is given a task, a read-only view of the repository, and exactly one
 * way to finish: calling its `submit` tool with a strictly-schema'd payload.
 * That shape matters. It means the loop terminates on a validated data
 * structure rather than on prose we then have to parse, and it means a run that
 * goes sideways — budget exhausted, tool errors, the model declining — ends in a
 * typed failure the campaign can handle instead of a half-parsed answer.
 */

import type Anthropic from "@anthropic-ai/sdk";
import type { Budget } from "./budget.js";
import type { Effort, ModelClient } from "./client.js";
import { investigationTools, runTool, type ToolContext } from "./tools.js";

export interface AgentRunOptions<T> {
  readonly agentId: string;
  readonly model: string;
  readonly effort: Effort;
  readonly system: string;
  readonly task: string;
  readonly submitTool: Anthropic.Tool;
  readonly toolContext: ToolContext;
  readonly budget: Budget;
  readonly client: ModelClient;
  readonly maxTurns?: number;
  readonly maxTokens?: number;
  /** Rejects a malformed submission so the model can correct it in-loop. */
  readonly validate: (input: unknown) => { ok: true; value: T } | { ok: false; error: string };
  readonly log?: (message: string) => void;
}

export interface AgentRunResult<T> {
  readonly value: T;
  readonly rationale: string;
  readonly model: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly turns: number;
  readonly toolCalls: number;
}

export class AgentFailure extends Error {
  constructor(
    readonly agentId: string,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(`${agentId}: ${message}`, options);
    this.name = "AgentFailure";
  }
}

const DEFAULT_MAX_TURNS = 12;

export async function runAgent<T>(options: AgentRunOptions<T>): Promise<AgentRunResult<T>> {
  const tools = [...investigationTools(options.toolContext), options.submitTool];
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: options.task }];

  let inputTokens = 0;
  let outputTokens = 0;
  let toolCalls = 0;
  const maxTurns = options.maxTurns ?? DEFAULT_MAX_TURNS;

  for (let turn = 1; turn <= maxTurns; turn++) {
    options.budget.assertCanSpend();

    const response = await options.client.complete({
      system: options.system,
      messages,
      tools,
      model: options.model,
      maxTokens: options.maxTokens ?? 16_000,
      effort: options.effort,
    });

    options.budget.record(response.model, response.usage);
    inputTokens += response.usage.inputTokens;
    outputTokens += response.usage.outputTokens;

    if (response.stopReason === "refusal") {
      throw new AgentFailure(options.agentId, "the model declined this request");
    }

    const toolUses = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );

    if (toolUses.length === 0) {
      // No tool call and no submission: nudge once, then give up rather than
      // letting a chatty model burn the budget in a loop.
      if (turn === maxTurns) break;
      messages.push({ role: "assistant", content: response.content });
      messages.push({
        role: "user",
        content: `Call the ${options.submitTool.name} tool with your conclusion. Do not reply with prose.`,
      });
      continue;
    }

    messages.push({ role: "assistant", content: response.content });

    const submission = toolUses.find((use) => use.name === options.submitTool.name);
    if (submission) {
      const validated = options.validate(submission.input);
      if (validated.ok) {
        return {
          value: validated.value,
          rationale: textOf(response.content),
          model: response.model,
          inputTokens,
          outputTokens,
          turns: turn,
          toolCalls,
        };
      }
      // Hand the validation error back and let the model correct itself.
      messages.push({
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: submission.id,
            is_error: true,
            content: `Rejected: ${validated.error}. Correct the payload and submit again.`,
          },
        ],
      });
      continue;
    }

    // Investigation tools: run them all, return every result in one message.
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const use of toolUses) {
      toolCalls++;
      try {
        const output = await runTool(use.name, use.input as Record<string, unknown>, options.toolContext);
        results.push({ type: "tool_result", tool_use_id: use.id, content: output });
      } catch (error) {
        results.push({
          type: "tool_result",
          tool_use_id: use.id,
          is_error: true,
          content: `Tool failed: ${(error as Error).message}`,
        });
      }
    }
    options.log?.(`${options.agentId}: turn ${turn}, ${results.length} tool call(s)`);
    messages.push({ role: "user", content: results });
  }

  throw new AgentFailure(options.agentId, `did not submit a conclusion within ${maxTurns} turns`);
}

function textOf(content: readonly Anthropic.ContentBlock[]): string {
  return content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}
