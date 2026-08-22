import { describe, expect, it } from "vitest";
import type { Adjudication, Candidate } from "@ironbastion/core";
import { aggregateScore, scoreFinding, severityFor } from "./score.js";
import { estimateMigrationDifficulty } from "./difficulty.js";

const candidate = (overrides: Partial<Candidate> = {}): Candidate => ({
  id: "cand_1",
  scanId: "scan_1",
  algorithm: "RSA",
  primitive: "public-key-encryption",
  parameters: { keySize: 2048 },
  quantum: "broken",
  title: "RSA-2048",
  description: "",
  component: "acme/payments",
  ambiguity: [],
  provenance: {
    source: "collector",
    collectorId: "jvm-source",
    collectorVersion: "1.0.0",
    ruleId: "JVM-KEYPAIR-GEN",
    confidence: 0.95,
    evidence: [],
  },
  ...overrides,
});

const adjudication = (overrides: Partial<Adjudication> = {}): Adjudication => ({
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
    inputTokens: 0,
    outputTokens: 0,
    rationale: "",
    decidedAt: "2026-08-22T00:00:00.000Z",
  },
  ...overrides,
});

describe("scoreFinding", () => {
  it("scores externally exposed RSA protecting long-lived data as critical", () => {
    const risk = scoreFinding(candidate(), adjudication());
    expect(risk.score).toBeGreaterThanOrEqual(80);
    expect(risk.severity).toBe("critical");
  });

  it("is deterministic — the same evidence always gives the same number", () => {
    const a = scoreFinding(candidate(), adjudication());
    const b = scoreFinding(candidate(), adjudication());
    expect(a.score).toBe(b.score);
  });

  it("drops the score when the same algorithm protects only ephemeral data", () => {
    const long = scoreFinding(candidate(), adjudication({ dataLifetime: "indefinite" }));
    const brief = scoreFinding(candidate(), adjudication({ dataLifetime: "ephemeral" }));
    expect(brief.score).toBeLessThan(long.score);
  });

  it("caps anything that only runs in tests, however alarming the algorithm", () => {
    const risk = scoreFinding(
      candidate({ algorithm: "MD5", primitive: "hash", quantum: "broken" }),
      adjudication({ reachability: "test-only" }),
    );
    expect(risk.score).toBeLessThanOrEqual(35);
    expect(risk.explanation).toContain("test-only");
  });

  it("floors a classically broken algorithm that still runs in production", () => {
    const risk = scoreFinding(
      candidate({
        algorithm: "MD5",
        primitive: "hash",
        quantum: "broken",
        parameters: {},
      }),
      adjudication({ dataLifetime: "ephemeral", exposure: "isolated" }),
    );
    expect(risk.score).toBeGreaterThanOrEqual(65);
    expect(risk.explanation).toContain("broken classically");
  });

  it("treats an unresolved algorithm as uncertain, never as safe", () => {
    const unknown = scoreFinding(
      candidate({ algorithm: "UNRESOLVED", quantum: "unknown" }),
      adjudication(),
    );
    const safe = scoreFinding(candidate({ algorithm: "AES", quantum: "safe" }), adjudication());
    expect(unknown.score).toBeGreaterThan(safe.score);
  });

  it("explains itself in terms a reviewer can check", () => {
    const risk = scoreFinding(candidate(), adjudication());
    expect(risk.explanation).toContain("Shor");
    expect(risk.explanation).toContain("externally exposed");
    expect(risk.explanation).toContain("Migration difficulty");
  });

  it("weights an internal, unreachable path below an external, live one", () => {
    const live = scoreFinding(candidate(), adjudication());
    const dormant = scoreFinding(
      candidate(),
      adjudication({ reachability: "dead-code", exposure: "isolated" }),
    );
    expect(dormant.severity).toBe("informational");
    expect(dormant.score).toBeLessThan(live.score - 50);
  });
});

describe("severityFor", () => {
  it("maps the documented thresholds", () => {
    expect(severityFor(85)).toBe("critical");
    expect(severityFor(60)).toBe("high");
    expect(severityFor(40)).toBe("medium");
    expect(severityFor(20)).toBe("low");
    expect(severityFor(19)).toBe("informational");
  });
});

describe("estimateMigrationDifficulty", () => {
  it("rates certificates hardest — the issuer holds the pen", () => {
    const cert = estimateMigrationDifficulty(candidate({ primitive: "certificate" }));
    const cipher = estimateMigrationDifficulty(candidate({ primitive: "block-cipher" }));
    expect(cert.score).toBeGreaterThan(cipher.score);
  });

  it("raises difficulty when a library chooses the algorithm", () => {
    const plain = estimateMigrationDifficulty(candidate({ primitive: "signature" }));
    const wrapped = estimateMigrationDifficulty(
      candidate({ primitive: "signature", ambiguity: ["wrapper-library"] }),
    );
    expect(wrapped.score).toBeGreaterThan(plain.score);
    expect(wrapped.drivers.join(" ")).toContain("third-party library");
  });

  it("never leaves the 0–1 range", () => {
    const extreme = estimateMigrationDifficulty(
      candidate({
        primitive: "certificate",
        ambiguity: ["wrapper-library", "indirect-algorithm"],
        parameters: { provider: "BC" },
        provenance: {
          source: "collector",
          collectorId: "jvm-deps",
          collectorVersion: "1.0.0",
          ruleId: "JVM-DEP-BLOCKS-PQC",
          confidence: 0.9,
          evidence: [],
        },
      }),
    );
    expect(extreme.score).toBeLessThanOrEqual(1);
    expect(extreme.score).toBeGreaterThanOrEqual(0);
  });
});

describe("aggregateScore", () => {
  it("is driven by the worst exposure, not diluted by a long informational tail", () => {
    const critical = scoreFinding(candidate(), adjudication());
    const noise = scoreFinding(
      candidate({ algorithm: "AES", quantum: "safe", primitive: "block-cipher" }),
      adjudication({ dataLifetime: "ephemeral", exposure: "isolated", reachability: "dead-code" }),
    );
    const aggregate = aggregateScore([critical, ...Array(50).fill(noise)]);
    expect(aggregate.severity).toBe("critical");
  });

  it("counts findings by severity", () => {
    const critical = scoreFinding(candidate(), adjudication());
    const aggregate = aggregateScore([critical, critical]);
    expect(aggregate.counts.critical).toBe(2);
  });

  it("returns a zero posture for an empty scan", () => {
    expect(aggregateScore([])).toMatchObject({ overall: 0, severity: "informational" });
  });
});
