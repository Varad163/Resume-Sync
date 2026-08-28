import { describe, expect, it } from "vitest";
import { getFindingFingerprint, computeWatchtowerDiff } from "./watchtower.js";
import type { Finding } from "./findings.js";

const mockFinding = (opts: {
  id: string;
  algorithm: string;
  primitive: string;
  component: string;
  collectorId: string;
  ruleId: string;
  locator: string;
  line?: number;
  score: number;
  severity: "critical" | "high" | "medium" | "low" | "informational";
}): Finding => {
  return {
    id: opts.id,
    scanId: "scan_xxx",
    algorithm: opts.algorithm,
    primitive: opts.primitive as never,
    parameters: {},
    quantum: "broken",
    title: "Crypto Finding",
    description: "Finding description",
    component: opts.component,
    ambiguity: [],
    provenance: {
      source: "collector",
      collectorId: opts.collectorId,
      collectorVersion: "1.0",
      ruleId: opts.ruleId,
      confidence: 1.0,
      evidence: [
        {
          kind: "source-span",
          locator: opts.locator,
          startLine: opts.line ?? 10,
          endLine: opts.line ?? 10,
          observedAt: new Date().toISOString(),
        },
      ],
    },
    adjudication: {
      status: "confirmed",
      confidence: 1.0,
      reachability: "runtime",
      dataLifetime: "medium",
      exposure: "internal",
      rationale: "",
      provenance: {
        source: "agent",
        agentId: "agent_xx",
        model: "model_xx",
        promptVersion: "1.0",
        inputTokens: 10,
        outputTokens: 10,
        rationale: "",
        decidedAt: new Date().toISOString(),
      },
    },
    risk: {
      score: opts.score,
      severity: opts.severity,
      factors: {
        quantumExposure: 10,
        dataLifetime: 10,
        reachability: 10,
        networkExposure: 10,
        migrationDifficulty: 10,
      },
      explanation: "",
    },
  };
};

describe("Watchtower Posture Diff module", () => {
  it("generates identical fingerprints even if line numbers change", () => {
    const f1 = mockFinding({
      id: "f1",
      algorithm: "MD5",
      primitive: "hash",
      component: "ledger",
      collectorId: "jvm-source",
      ruleId: "md5-call",
      locator: "ledger/Vault.java",
      line: 15,
      score: 80,
      severity: "high",
    });

    const f2 = mockFinding({
      id: "f2",
      algorithm: "MD5",
      primitive: "hash",
      component: "ledger",
      collectorId: "jvm-source",
      ruleId: "md5-call",
      locator: "ledger/Vault.java",
      line: 45, // line changed
      score: 80,
      severity: "high",
    });

    expect(getFindingFingerprint(f1)).toBe(getFindingFingerprint(f2));
  });

  it("identifies introduced, resolved, and persistent findings correctly", () => {
    const prevMD5 = mockFinding({
      id: "f1",
      algorithm: "MD5",
      primitive: "hash",
      component: "ledger",
      collectorId: "jvm-source",
      ruleId: "md5-call",
      locator: "ledger/Vault.java",
      score: 80,
      severity: "high",
    });

    const prevAES = mockFinding({
      id: "f2",
      algorithm: "AES-CBC",
      primitive: "block-cipher",
      component: "gateway",
      collectorId: "jvm-source",
      ruleId: "aes-cbc-call",
      locator: "gateway/Client.java",
      score: 60,
      severity: "medium",
    });

    const currAES = mockFinding({
      id: "f2-new",
      algorithm: "AES-CBC",
      primitive: "block-cipher",
      component: "gateway",
      collectorId: "jvm-source",
      ruleId: "aes-cbc-call",
      locator: "gateway/Client.java",
      score: 75, // score increased
      severity: "high", // severity changed
    });

    const currSHA = mockFinding({
      id: "f3",
      algorithm: "SHA-256",
      primitive: "hash",
      component: "auth",
      collectorId: "jvm-source",
      ruleId: "sha256-call",
      locator: "auth/Token.java",
      score: 30,
      severity: "low",
    });

    const diff = computeWatchtowerDiff(
      [prevMD5, prevAES], // MD5 and AES in previous scan
      [currAES, currSHA], // AES (with modified score) and SHA-256 in current scan
      85, // previous posture score
      90, // current posture score
    );

    expect(diff.status).toBe("success");
    expect(diff.scoreShift).toBe(5);
    expect(diff.previousScore).toBe(85);
    expect(diff.currentScore).toBe(90);

    // MD5 was removed, so it is resolved
    expect(diff.resolved).toHaveLength(1);
    expect(diff.resolved[0]!.algorithm).toBe("MD5");

    // SHA-256 is new, so it is introduced
    expect(diff.introduced).toHaveLength(1);
    expect(diff.introduced[0]!.algorithm).toBe("SHA-256");

    // AES-CBC is persistent, with severity and score changes detected
    expect(diff.persistent).toHaveLength(1);
    expect(diff.persistent[0]!.finding.algorithm).toBe("AES-CBC");
    expect(diff.persistent[0]!.previousScore).toBe(60);
    expect(diff.persistent[0]!.currentScore).toBe(75);
    expect(diff.persistent[0]!.scoreDelta).toBe(15);
    expect(diff.persistent[0]!.severityChanged).toBe(true);
    expect(diff.persistent[0]!.previousSeverity).toBe("medium");
    expect(diff.persistent[0]!.currentSeverity).toBe("high");
  });
});
