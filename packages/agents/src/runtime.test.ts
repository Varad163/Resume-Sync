import { describe, expect, it } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import { fileURLToPath } from "node:url";
import { runAgent, AgentFailure } from "./runtime.js";
import { Budget, BudgetExhausted } from "./budget.js";
import { ScriptedClient, text, toolUse } from "./testing.js";
import { safeResolve, runTool, investigationTools } from "./tools.js";

const repoRoot = fileURLToPath(new URL("../../../fixtures/java-payments", import.meta.url));

const SUBMIT: Anthropic.Tool = {
  name: "submit",
  description: "Submit the answer.",
  input_schema: {
    type: "object",
    properties: { answer: { type: "string" } },
    required: ["answer"],
    additionalProperties: false,
  },
};

const validate = (input: unknown) => {
  const answer = (input as { answer?: unknown })?.answer;
  return typeof answer === "string" && answer.length > 0
    ? ({ ok: true, value: answer } as const)
    : ({ ok: false, error: "answer must be a non-empty string" } as const);
};

const run = (client: ScriptedClient, budget = new Budget(500)) =>
  runAgent<string>({
    agentId: "test-agent",
    model: "claude-opus-5",
    effort: "medium",
    system: "You are a test agent.",
    task: "Answer the question.",
    submitTool: SUBMIT,
    toolContext: { repoRoot, metadataOnly: false },
    budget,
    client,
    validate,
  });

describe("runAgent", () => {
  it("returns the validated submission", async () => {
    const client = new ScriptedClient([{ content: [toolUse("submit", { answer: "done" })] }]);
    const result = await run(client);
    expect(result.value).toBe("done");
    expect(result.turns).toBe(1);
  });

  it("offers the investigation tools alongside the submit tool", async () => {
    const client = new ScriptedClient([{ content: [toolUse("submit", { answer: "done" })] }]);
    await run(client);
    const names = client.requests[0]?.tools.map((t) => t.name);
    expect(names).toEqual(["read_file", "search_repository", "list_files", "submit"]);
  });

  it("runs an investigation tool and feeds the result back", async () => {
    const client = new ScriptedClient([
      { content: [toolUse("read_file", { path: "pom.xml", start_line: 1, end_line: 3 })] },
      { content: [toolUse("submit", { answer: "read it" })] },
    ]);
    const result = await run(client);
    expect(result.toolCalls).toBe(1);
    const followUp = client.requests[1]?.messages.at(-1);
    expect(JSON.stringify(followUp)).toContain("modelVersion");
  });

  it("hands a validation failure back so the model can correct itself", async () => {
    const client = new ScriptedClient([
      { content: [toolUse("submit", { answer: "" })] },
      { content: [toolUse("submit", { answer: "corrected" })] },
    ]);
    const result = await run(client);
    expect(result.value).toBe("corrected");
    const correction = JSON.stringify(client.requests[1]?.messages.at(-1));
    expect(correction).toContain("answer must be a non-empty string");
    expect(correction).toContain("is_error");
  });

  it("nudges a model that replies with prose instead of calling the tool", async () => {
    const client = new ScriptedClient([
      { content: [text("Here is my answer in words.")], stopReason: "end_turn" },
      { content: [toolUse("submit", { answer: "ok" })] },
    ]);
    await run(client);
    expect(JSON.stringify(client.requests[1]?.messages.at(-1))).toContain("Do not reply with prose");
  });

  it("fails cleanly when the model never submits", async () => {
    const script = Array.from({ length: 3 }, () => ({
      content: [text("thinking about it")],
      stopReason: "end_turn",
    }));
    const client = new ScriptedClient(script);
    await expect(
      runAgent<string>({
        agentId: "test-agent",
        model: "claude-opus-5",
        effort: "low",
        system: "s",
        task: "t",
        submitTool: SUBMIT,
        toolContext: { repoRoot, metadataOnly: false },
        budget: new Budget(500),
        client,
        maxTurns: 3,
        validate,
      }),
    ).rejects.toBeInstanceOf(AgentFailure);
  });

  it("stops when the model refuses rather than looping", async () => {
    const client = new ScriptedClient([{ content: [text("no")], stopReason: "refusal" }]);
    await expect(run(client)).rejects.toThrow(/declined/);
  });

  it("refuses to start a turn once the budget is exhausted", async () => {
    const budget = new Budget(0.0001);
    const client = new ScriptedClient([{ content: [toolUse("submit", { answer: "x" })] }]);
    budget.record("claude-opus-5", { inputTokens: 100_000, outputTokens: 10_000, cacheReadTokens: 0 });
    await expect(run(client, budget)).rejects.toBeInstanceOf(BudgetExhausted);
  });

  it("accounts for spend as it goes", async () => {
    const budget = new Budget(500);
    const client = new ScriptedClient([
      { content: [toolUse("submit", { answer: "x" })], usage: { inputTokens: 1_000_000, outputTokens: 100_000 } },
    ]);
    await run(client, budget);
    // 1M input at $5 + 100k output at $25 = $7.50
    expect(budget.spentCents).toBeCloseTo(750, 0);
  });
});

describe("investigation tools", () => {
  it("refuses to read outside the repository", async () => {
    expect(safeResolve(repoRoot, "../../etc/passwd")).toBeUndefined();
    expect(safeResolve(repoRoot, "/etc/passwd")).toBeUndefined();
    expect(safeResolve(repoRoot, "pom.xml")).toContain("java-payments/pom.xml");
    const refusal = await runTool("read_file", { path: "../../../etc/passwd" }, { repoRoot, metadataOnly: false });
    expect(refusal).toContain("Refused");
  });

  it("bounds how much of a file one read returns", async () => {
    const output = await runTool(
      "read_file",
      { path: "pom.xml", start_line: 1, end_line: 10_000 },
      { repoRoot, metadataOnly: false },
    );
    expect(output.split("\n").length).toBeLessThan(130);
  });

  it("searches with file and line numbers", async () => {
    const output = await runTool(
      "search_repository",
      { pattern: "getInstance\\(\"RSA\"\\)", glob: "**/*.java" },
      { repoRoot, metadataOnly: false },
    );
    expect(output).toContain("TokenVault.java:");
  });

  it("offers no tools at all in metadata-only mode", async () => {
    expect(investigationTools({ repoRoot, metadataOnly: true })).toEqual([]);
    const output = await runTool("read_file", { path: "pom.xml" }, { repoRoot, metadataOnly: true });
    expect(output).toContain("metadata-only");
  });

  it("reports a missing file rather than throwing", async () => {
    const output = await runTool("read_file", { path: "nope.java" }, { repoRoot, metadataOnly: false });
    expect(output).toContain("Could not read");
  });
});
