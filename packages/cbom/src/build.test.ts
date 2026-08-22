import { describe, expect, it } from "vitest";
import { EMPTY_STATS, type Finding, type ScanRecord } from "@ironbastion/core";
import { buildCbom } from "./build.js";
import { bomRefFor, nistSecurityLevel, toPadding } from "./mapping.js";

const scan: ScanRecord = {
  id: "scan_abc",
  tenantId: "t1",
  projectId: "proj_1",
  status: "succeeded",
  phase: "DONE",
  targets: [],
  options: { metadataOnly: false, budgetCents: 500, humanReviewThreshold: 0.6 },
  startedAt: "2026-08-22T10:00:00.000Z",
  finishedAt: "2026-08-22T10:05:00.000Z",
  stats: EMPTY_STATS,
};

const finding = (overrides: Partial<Finding> = {}): Finding =>
  ({
    id: "cand_1",
    scanId: scan.id,
    algorithm: "RSA",
    primitive: "public-key-encryption",
    parameters: { keySize: 2048, padding: "PKCS1Padding" },
    quantum: "broken",
    title: "RSA-2048 key transport",
    description: "",
    component: "acme/payments",
    ambiguity: [],
    provenance: {
      source: "collector",
      collectorId: "jvm-source",
      collectorVersion: "1.0.0",
      ruleId: "JVM-CIPHER",
      confidence: 0.95,
      evidence: [
        {
          kind: "source-span",
          locator: "src/main/java/TokenVault.java",
          startLine: 25,
          snippetSha256: "a".repeat(64),
          observedAt: scan.startedAt,
        },
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
        inputTokens: 0,
        outputTokens: 0,
        rationale: "",
        decidedAt: scan.startedAt,
      },
    },
    risk: {
      score: 92,
      severity: "critical",
      factors: {
        quantumExposure: 1,
        dataLifetime: 0.85,
        reachability: 1,
        networkExposure: 1,
        migrationDifficulty: 0.8,
      },
      explanation: "",
    },
    ...overrides,
  }) as Finding;

const build = (findings: Finding[]) =>
  buildCbom(scan, findings, { projectName: "acme-payments", projectVersion: "3.4.1" });

describe("buildCbom", () => {
  it("emits a well-formed CycloneDX 1.6 document", () => {
    const bom = build([finding()]);
    expect(bom.bomFormat).toBe("CycloneDX");
    expect(bom.specVersion).toBe("1.6");
    expect(bom.serialNumber).toMatch(/^urn:uuid:/);
    expect(bom.metadata.tools.components[0]?.name).toBe("IronBastion");
    expect(bom.metadata.component.name).toBe("acme-payments");
  });

  it("collapses repeated use of one algorithm into a single asset with many occurrences", () => {
    const bom = build([
      finding({ id: "a", component: "acme/payments" }),
      finding({ id: "b", component: "acme/gateway" }),
      finding({ id: "c", component: "acme/ledger" }),
    ]);
    expect(bom.components).toHaveLength(1);
    expect(bom.components[0]?.evidence?.occurrences).toHaveLength(3);
    const components = bom.components[0]?.properties?.find(
      (p) => p.name === "ironbastion:components",
    );
    expect(components?.value).toBe("acme/gateway, acme/ledger, acme/payments");
  });

  it("keeps different key sizes and modes as different assets", () => {
    const bom = build([
      finding({ parameters: { keySize: 2048 } }),
      finding({ parameters: { keySize: 4096 } }),
      finding({ algorithm: "AES", primitive: "block-cipher", parameters: { keySize: 256, mode: "GCM" } }),
      finding({ algorithm: "AES", primitive: "block-cipher", parameters: { keySize: 256, mode: "CBC" } }),
    ]);
    expect(bom.components).toHaveLength(4);
  });

  it("marks quantum-vulnerable algorithms as NIST security level 0", () => {
    const bom = build([finding()]);
    expect(bom.components[0]?.cryptoProperties.algorithmProperties?.nistQuantumSecurityLevel).toBe(0);
  });

  it("maps the primitive and parameters into CycloneDX vocabulary", () => {
    const properties = build([finding()]).components[0]?.cryptoProperties.algorithmProperties;
    expect(properties?.primitive).toBe("pke");
    expect(properties?.parameterSetIdentifier).toBe("2048");
    expect(properties?.padding).toBe("pkcs1v15");
    expect(properties?.cryptoFunctions).toContain("encrypt");
  });

  it("emits protocol assets with protocolProperties", () => {
    const bom = build([
      finding({
        algorithm: "TLS1.2",
        primitive: "protocol",
        parameters: { protocolVersion: "TLSv1.2" },
      }),
    ]);
    expect(bom.components[0]?.cryptoProperties.assetType).toBe("protocol");
    expect(bom.components[0]?.cryptoProperties.protocolProperties).toEqual({
      type: "tls",
      version: "TLSv1.2",
    });
  });

  it("carries the risk position through as properties an auditor can read", () => {
    const properties = build([finding()]).components[0]?.properties ?? [];
    expect(properties).toContainEqual({ name: "ironbastion:severity", value: "critical" });
    expect(properties).toContainEqual({ name: "ironbastion:risk-score", value: "92" });
  });

  it("counts quantum-vulnerable assets in the document metadata", () => {
    const bom = build([
      finding(),
      finding({ algorithm: "AES", primitive: "block-cipher", quantum: "safe", parameters: { keySize: 256 } }),
    ]);
    expect(bom.metadata.properties).toContainEqual({
      name: "ironbastion:quantum-vulnerable-assets",
      value: "1",
    });
  });

  it("orders components stably so two CBOMs of one estate can be diffed", () => {
    const first = build([finding({ algorithm: "AES", parameters: { keySize: 256 } }), finding()]);
    const second = build([finding(), finding({ algorithm: "AES", parameters: { keySize: 256 } })]);
    expect(first.components.map((c) => c["bom-ref"])).toEqual(
      second.components.map((c) => c["bom-ref"]),
    );
  });

  it("produces an empty but valid document for a clean scan", () => {
    const bom = build([]);
    expect(bom.components).toEqual([]);
    expect(bom.specVersion).toBe("1.6");
  });
});

describe("mapping", () => {
  it("builds stable, readable bom-refs", () => {
    expect(bomRefFor("RSA", { keySize: 2048 })).toBe("crypto/algorithm/rsa-2048");
    expect(bomRefFor("ECDSA", { curve: "secp256r1" })).toBe("crypto/algorithm/ecdsa-secp256r1");
  });

  it("gives AES-256 the top NIST category and AES-128 the lowest", () => {
    expect(nistSecurityLevel("AES", "safe", { keySize: 256 })).toBe(5);
    expect(nistSecurityLevel("AES", "weakened", { keySize: 128 })).toBe(1);
  });

  it("gives anything Shor breaks a level of 0, whatever its classical strength", () => {
    expect(nistSecurityLevel("RSA", "broken", { keySize: 15360 })).toBe(0);
  });

  it("normalises padding names", () => {
    expect(toPadding("PKCS5Padding")).toBe("pkcs5");
    expect(toPadding("OAEPWithSHA-256AndMGF1Padding")).toBe("oaep");
    expect(toPadding("NoPadding")).toBe("raw");
  });
});
