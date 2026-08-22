/**
 * Findings are built from customer source code, so every string in this report
 * is attacker-influenced. These tests exist to keep it that way harmlessly.
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_SCAN_OPTIONS, EMPTY_STATS, type Finding, type ScanRecord } from "@ironbastion/core";
import { escapeHtml, renderHtmlReport } from "./report.js";

const scan: ScanRecord = {
  id: "scan_1",
  tenantId: "t1",
  projectId: "p1",
  status: "succeeded",
  phase: "DONE",
  targets: [],
  options: DEFAULT_SCAN_OPTIONS,
  startedAt: "2026-08-22T10:00:00.000Z",
  finishedAt: "2026-08-22T10:04:00.000Z",
  stats: { ...EMPTY_STATS, needsHuman: 2, inputTokens: 1200, outputTokens: 300, costCents: 4.2 },
};

const hostile = '"><script>alert(1)</script>';

const finding = (overrides: Partial<Finding> = {}): Finding =>
  ({
    id: "f1",
    scanId: scan.id,
    algorithm: "RSA",
    primitive: "public-key-encryption",
    parameters: { keySize: 2048 },
    quantum: "broken",
    title: `RSA-2048 ${hostile}`,
    description: "",
    component: "payments",
    ambiguity: [],
    recommendedAlgorithm: "ML-KEM-768",
    provenance: {
      source: "collector",
      collectorId: "jvm-source",
      collectorVersion: "1",
      ruleId: "JVM-CIPHER",
      confidence: 0.95,
      evidence: [
        { kind: "source-span", locator: `src/${hostile}.java`, startLine: 4, observedAt: scan.startedAt },
      ],
    },
    adjudication: {
      status: "confirmed",
      confidence: 0.9,
      reachability: "runtime",
      dataLifetime: "long",
      exposure: "external",
      rationale: "",
      provenance: {
        source: "agent",
        agentId: "sentinel",
        model: "claude-opus-5",
        promptVersion: "1",
        inputTokens: 1,
        outputTokens: 1,
        rationale: "",
        decidedAt: scan.startedAt,
      },
    },
    risk: {
      score: 92,
      severity: "critical",
      factors: { quantumExposure: 1, dataLifetime: 1, reachability: 1, networkExposure: 1, migrationDifficulty: 1 },
      explanation: `Broken by Shor ${hostile}`,
    },
    ...overrides,
  }) as Finding;

const render = (findings: Finding[] = [finding()]) =>
  renderHtmlReport({ scan, projectName: `Acme ${hostile}`, findings, notes: [hostile] });

describe("renderHtmlReport", () => {
  it("escapes hostile content from source, titles, notes and the project name", () => {
    const html = render();
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("renders a complete document with the scan identity", () => {
    const html = render();
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("scan_1");
    expect(html).toContain("92");
  });

  it("reports how many findings a model judged versus rules", () => {
    const byRules = finding({
      id: "f2",
      adjudication: {
        ...finding().adjudication,
        provenance: { ...finding().adjudication.provenance, model: "deterministic-rules/1.0" },
      },
    });
    const html = render([finding(), byRules]);
    expect(html).toContain("1 were judged by a model");
    expect(html).toContain("1\n    were judged by rules");
  });

  it("carries the standing disclosure", () => {
    expect(render()).toContain("not an accredited laboratory");
  });

  it("renders an empty scan without breaking", () => {
    const html = renderHtmlReport({ scan, projectName: "Empty", findings: [], notes: [] });
    expect(html).toContain("<!doctype html>");
  });
});

describe("escapeHtml", () => {
  it("escapes every character that can break out of an attribute or element", () => {
    expect(escapeHtml(`<>&"'`)).toBe("&lt;&gt;&amp;&quot;&#39;");
  });
});
