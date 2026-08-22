/**
 * Model access.
 *
 * The product reaches Claude through Claude Platform on AWS, so the Fargate
 * task role is the credential — there is no API key to store, rotate or leak.
 * The interface below is deliberately narrow: everything the agents need is a
 * single `complete` call, which keeps the real client, a recorded client for
 * tests, and the deterministic fallback interchangeable.
 */

import type Anthropic from "@anthropic-ai/sdk";

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export interface ModelRequest {
  readonly system: string;
  readonly messages: Anthropic.MessageParam[];
  readonly tools: Anthropic.Tool[];
  readonly model: string;
  readonly maxTokens: number;
  readonly effort: Effort;
}

export interface ModelUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheReadTokens: number;
}

export interface ModelResponse {
  readonly content: Anthropic.ContentBlock[];
  readonly stopReason: string | null;
  readonly usage: ModelUsage;
  readonly model: string;
}

export interface ModelClient {
  /** Recorded in provenance, so every verdict says which brain produced it. */
  readonly id: string;
  complete(request: ModelRequest): Promise<ModelResponse>;
}

export const MODELS = {
  /** Adjudication and planning — the judgement calls. */
  reasoning: "claude-opus-5",
  /** High-volume, low-ambiguity triage. */
  triage: "claude-haiku-4-5",
} as const;

/** First-party rates, US dollars per million tokens. */
const PRICES: Record<string, { input: number; output: number }> = {
  "claude-opus-5": { input: 5, output: 25 },
  "claude-sonnet-5": { input: 3, output: 15 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

export function costCents(model: string, usage: ModelUsage): number {
  const price = PRICES[model] ?? PRICES["claude-opus-5"]!;
  const dollars =
    (usage.inputTokens / 1_000_000) * price.input +
    (usage.outputTokens / 1_000_000) * price.output;
  return dollars * 100;
}

/** Claude Platform on AWS: SigV4 through the task role, bare model ids. */
export async function createAwsClient(): Promise<ModelClient> {
  const { AnthropicAws } = await import("@anthropic-ai/aws-sdk");
  const client = new AnthropicAws();

  return {
    id: "claude-platform-on-aws",
    async complete(request: ModelRequest): Promise<ModelResponse> {
      const response = await client.messages.create({
        model: request.model,
        max_tokens: request.maxTokens,
        system: [{ type: "text", text: request.system, cache_control: { type: "ephemeral" } }],
        messages: request.messages,
        tools: request.tools,
        thinking: { type: "adaptive" },
        output_config: { effort: request.effort },
      });

      return {
        content: response.content,
        stopReason: response.stop_reason,
        model: response.model,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
        },
      };
    },
  };
}

/** Direct Anthropic API, for local development against an API key. */
export async function createDirectClient(): Promise<ModelClient> {
  const { default: AnthropicSdk } = await import("@anthropic-ai/sdk");
  const client = new AnthropicSdk();

  return {
    id: "anthropic-api",
    async complete(request: ModelRequest): Promise<ModelResponse> {
      const response = await client.messages.create({
        model: request.model,
        max_tokens: request.maxTokens,
        system: [{ type: "text", text: request.system, cache_control: { type: "ephemeral" } }],
        messages: request.messages,
        tools: request.tools,
        thinking: { type: "adaptive" },
        output_config: { effort: request.effort },
      });

      return {
        content: response.content,
        stopReason: response.stop_reason,
        model: response.model,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
        },
      };
    },
  };
}

export type ProviderName = "aws" | "anthropic" | "deterministic";

export function configuredProvider(env: NodeJS.ProcessEnv = process.env): ProviderName {
  const explicit = env["IRONBASTION_MODEL_PROVIDER"];
  if (explicit === "aws" || explicit === "anthropic" || explicit === "deterministic") {
    return explicit;
  }
  if (env["ANTHROPIC_AWS_WORKSPACE_ID"] && env["AWS_REGION"]) return "aws";
  if (env["ANTHROPIC_API_KEY"]) return "anthropic";
  return "deterministic";
}
