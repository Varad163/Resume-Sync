/** A scripted model client, so agent behaviour is tested without a live call. */

import type Anthropic from "@anthropic-ai/sdk";
import type { ModelClient, ModelRequest, ModelResponse } from "./client.js";

export interface ScriptedTurn {
  readonly content: Anthropic.ContentBlock[];
  readonly stopReason?: string;
  readonly usage?: { inputTokens: number; outputTokens: number };
}

export function toolUse(name: string, input: unknown, id = `tu_${name}`): Anthropic.ContentBlock {
  return { type: "tool_use", id, name, input } as Anthropic.ContentBlock;
}

export function text(value: string): Anthropic.ContentBlock {
  return { type: "text", text: value, citations: [] } as unknown as Anthropic.ContentBlock;
}

export class ScriptedClient implements ModelClient {
  readonly id = "scripted";
  readonly requests: ModelRequest[] = [];
  #turn = 0;

  constructor(private readonly script: readonly ScriptedTurn[]) {}

  get turnsUsed(): number {
    return this.#turn;
  }

  async complete(request: ModelRequest): Promise<ModelResponse> {
    // Snapshot: the loop keeps mutating the same messages array, so storing the
    // reference would make every recorded request show the final state.
    this.requests.push({ ...request, messages: structuredClone(request.messages) });
    const turn = this.script[this.#turn];
    this.#turn++;
    if (!turn) throw new Error(`ScriptedClient ran out of turns at ${this.#turn}`);
    return {
      content: turn.content,
      stopReason: turn.stopReason ?? "tool_use",
      model: request.model,
      usage: {
        inputTokens: turn.usage?.inputTokens ?? 1000,
        outputTokens: turn.usage?.outputTokens ?? 200,
        cacheReadTokens: 0,
      },
    };
  }
}
