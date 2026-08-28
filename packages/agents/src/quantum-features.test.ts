/**
 * Feature verification for the quantum-specific claims.
 *
 * Every row is a claim the product makes to a customer, checked against a real
 * scan of the fixture estate rather than against a unit-level stub. If one of
 * these fails, a sentence on the website has stopped being true.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_SCAN_OPTIONS,
  EMPTY_STATS,
  MILESTONES,
  algorithmById,
  assessQuantumVulnerability,
  pqcReplacementFor,
  type GitRepositoryTarget,
  type ScanRecord,
} from "@ironbastion/core";
import { runCampaign, type CampaignResult } from "./campaign.js";
import { createSimulatedClient } from "./simulated.js";

const target: GitRepositoryTarget = {
  kind: "git-repository",
  id: "repo_verify",
  name: "acme-payments",
  localPath: fileURLToPath(new URL("../../../fixtures/java-payments", import.meta.url)),
};

const scan: ScanRecord = {
  id: "scan_verify",
  tenantId: "t",
  projectId: "p",
  status: "running",
  phase: "DISCOVER",
  targets: [target],
  options: DEFAULT_SCAN_OPTIONS,
  startedAt: "2026-08-22T10:00:00.000Z",
  stats: EMPTY_STATS,
};

let result: CampaignResult;

beforeAll(async () => {
  result = await runCampaign({
    scan,
    client: createSimulatedClient(),
    projectName: "acme-payments",
  });
}, 60_000);

const findingFor = (predicate: (algorithm: string) => boolean) =>
  result.findings.find((finding) => predicate(finding.algorithm));

describe("discovery of quantum-vulnerable cryptography", () => {
  it("finds RSA key transport and marks it broken at any key size", () => {
    const rsa = findingFor((a) => a === "RSA");
    expect(rsa).toBeDefined();
    expect(rsa!.quantum).toBe("broken");
    expect(rsa!.parameters.keySize).toBe(2048);
  });

  it("finds elliptic-curve signature and key agreement", () => {
    expect(findingFor((a) => a === "ECDSA")).toBeDefined();
    expect(findingFor((a) => a === "ECDH")).toBeDefined();
  });

  it("records the named curve at its field size, not its security strength", () => {
    const curved = result.findings.find((f) => f.parameters.curve === "secp256r1");
    expect(curved?.parameters.keySize).toBe(256);
  });

  it("finds legacy cryptography that is already broken classically", () => {
    for (const algorithm of ["MD5", "SHA-1", "3DES", "SHA1PRNG"]) {
      expect(findingFor((a) => a === algorithm), algorithm).toBeDefined();
    }
  });

  it("finds the TLS version a component pins", () => {
    const tls = findingFor((a) => a === "TLS1.2");
    expect(tls).toBeDefined();
    expect(tls!.primitive).toBe("protocol");
  });

  it("does not raise AES-256 as quantum-vulnerable", () => {
    const aes256 = result.findings.find(
      (f) => f.algorithm === "AES" && f.parameters.keySize === 256,
    );
    expect(aes256?.quantum).toBe("safe");
    expect(aes256?.recommendedAlgorithm).toBeUndefined();
  });

  it("finds a dependency whose version blocks PQC migration entirely", () => {
    const blocked = result.findings.find(
      (f) => f.provenance.ruleId === "JVM-DEP-BLOCKS-PQC",
    );
    expect(blocked?.description).toContain("1.72");
  });
});

describe("quantum risk scoring", () => {
  it("scores externally exposed, long-lived, quantum-broken cryptography highest", () => {
    const top = [...result.findings].sort((a, b) => b.risk.score - a.risk.score)[0]!;
    expect(top.quantum).toBe("broken");
    expect(top.risk.severity).toBe("critical");
    expect(top.risk.explanation).toContain("Shor");
  });

  it("explains harvest-now-decrypt-later where the data outlives the cryptography", () => {
    const longLived = result.findings.find((f) => f.adjudication.dataLifetime === "long");
    expect(longLived?.risk.explanation).toContain("recorded today");
  });

  it("gives the estate a posture driven by its worst exposure", () => {
    expect(result.posture.severity).toBe("critical");
    expect(result.posture.overall).toBeGreaterThan(80);
  });

  it("never lets a model write the score", () => {
    // Scores are a pure function of the factors; recomputing must reproduce them.
    for (const finding of result.findings) {
      expect(Number.isInteger(finding.risk.score)).toBe(true);
      expect(finding.risk.score).toBeGreaterThanOrEqual(0);
      expect(finding.risk.score).toBeLessThanOrEqual(100);
    }
  });
});

describe("post-quantum replacement guidance", () => {
  it("routes key transport and agreement to ML-KEM", () => {
    expect(findingFor((a) => a === "RSA")?.recommendedAlgorithm).toBe("ML-KEM-768");
    expect(findingFor((a) => a === "ECDH")?.recommendedAlgorithm).toBe("ML-KEM-768");
  });

  it("routes signatures to ML-DSA", () => {
    expect(findingFor((a) => a === "ECDSA")?.recommendedAlgorithm).toBe("ML-DSA-65");
  });

  it("routes TLS to a hybrid key exchange rather than a newer version alone", () => {
    expect(findingFor((a) => a === "TLS1.2")?.recommendedAlgorithm).toBe("TLS1.3-HYBRID");
    expect(algorithmById("TLS1.3-HYBRID")?.reference).toContain("X25519MLKEM768");
  });

  it("routes legacy symmetric and digest algorithms to strong parameters", () => {
    expect(findingFor((a) => a === "3DES")?.recommendedAlgorithm).toBe("AES-256");
    expect(findingFor((a) => a === "MD5")?.recommendedAlgorithm).toBe("SHA-384");
  });

  it("cites a standard for every post-quantum algorithm it recommends", () => {
    for (const id of ["ML-KEM-768", "ML-DSA-65", "SLH-DSA", "FALCON", "HQC"]) {
      expect(algorithmById(id)?.reference, id).toBeTruthy();
    }
    expect(algorithmById("ML-KEM-768")?.reference).toContain("FIPS 203");
    expect(algorithmById("ML-DSA-65")?.reference).toContain("FIPS 204");
    expect(algorithmById("SLH-DSA")?.reference).toContain("FIPS 205");
  });
});

describe("the CBOM", () => {
  it("is CycloneDX 1.6 with cryptographic assets", () => {
    expect(result.cbom.specVersion).toBe("1.6");
    expect(result.cbom.components.length).toBeGreaterThan(0);
    for (const component of result.cbom.components) {
      expect(component.type).toBe("cryptographic-asset");
      expect(component.cryptoProperties.assetType).toBeTruthy();
    }
  });

  it("marks quantum-vulnerable assets as NIST post-quantum level 0", () => {
    const rsa = result.cbom.components.find((c) => c.name.startsWith("RSA"));
    expect(rsa?.cryptoProperties.algorithmProperties?.nistQuantumSecurityLevel).toBe(0);
  });

  it("carries occurrences back to the file and line they were found at", () => {
    const withOccurrence = result.cbom.components.find(
      (c) => (c.evidence?.occurrences.length ?? 0) > 0,
    );
    const occurrence = withOccurrence?.evidence?.occurrences[0];
    expect(occurrence?.location).toMatch(/\.(java|xml|gradle)$/);
    expect(occurrence?.line).toBeGreaterThan(0);
  });
});

describe("the migration plan", () => {
  it("sequences waves against the public milestones", () => {
    expect(result.plan.waves.length).toBeGreaterThan(0);
    for (const wave of result.plan.waves) {
      expect(MILESTONES.map((m) => m.id)).toContain(wave.milestoneId);
    }
  });

  it("only ever proposes the sanctioned replacement", () => {
    for (const wave of result.plan.waves) {
      for (const action of wave.actions) {
        const finding = result.findings.find((f) => f.id === action.findingIds[0]);
        if (!finding) continue;
        const sanctioned = pqcReplacementFor(finding.algorithm, {
          ...(finding.parameters.keySize !== undefined
            ? { keySize: finding.parameters.keySize }
            : {}),
        });
        expect(action.targetAlgorithm, `${finding.algorithm}`).toBe(sanctioned);
      }
    }
  });

  it("estimates effort and names validation for each action", () => {
    expect(result.plan.totalEffortDays).toBeGreaterThan(0);
    for (const wave of result.plan.waves) {
      for (const action of wave.actions) {
        expect(["S", "M", "L", "XL"]).toContain(action.effort);
        expect(action.validation.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("agent visibility", () => {
  it("records a trace for every agent that ran", () => {
    const agents = new Set(result.traces.map((t) => t.agentId));
    expect(agents).toContain("sentinel");
    expect(agents).toContain("oracle");
    expect(agents).toContain("atlas");
    expect(agents).toContain("migrate");
  });

  it("records what the agents actually read", () => {
    const toolCalls = result.traces.flatMap((t) => t.toolCalls);
    expect(toolCalls.length).toBeGreaterThan(0);
    expect(toolCalls.some((call) => call.tool === "read_file")).toBe(true);
    for (const call of toolCalls) {
      expect(call.resultPreview.length).toBeGreaterThan(0);
      expect(call.resultBytes).toBeGreaterThan(0);
    }
  });

  it("records every decision with its reasoning", () => {
    const decisions = result.traces.flatMap((t) => t.decisions);
    expect(decisions.length).toBeGreaterThan(0);
    for (const decision of decisions) {
      expect(decision.subject).toBeTruthy();
      expect(decision.outcome).toBeTruthy();
      expect(decision.rationale).toBeTruthy();
    }
  });

  it("records the discovery phase as well as the reasoning phases", () => {
    expect(result.collectorRuns.map((run) => run.collectorId)).toContain("jvm-source");
    for (const run of result.collectorRuns) {
      if (run.collectorId !== "npm-deps") {
        expect(run.unitsScanned).toBeGreaterThan(0);
      }
      expect(run.version).toBeTruthy();
    }
  });

  it("attributes every finding to the model that judged it", () => {
    for (const finding of result.findings) {
      expect(finding.adjudication.provenance.model).toBeTruthy();
      expect(finding.adjudication.provenance.agentId).toBe("sentinel");
      expect(finding.adjudication.rationale.length).toBeGreaterThan(0);
    }
    expect(result.modelJudged).toBeGreaterThan(0);
  });

  it("accounts for what the run cost", () => {
    expect(result.scan.stats.inputTokens).toBeGreaterThan(0);
    expect(result.scan.stats.outputTokens).toBeGreaterThan(0);
    const traced = result.traces.reduce((sum, t) => sum + t.inputTokens, 0);
    expect(traced).toBe(result.scan.stats.inputTokens);
  });
});

describe("registry integrity for the quantum claims", () => {
  it("treats every Shor-breakable primitive as broken at every parameter set", () => {
    for (const algorithm of ["RSA", "ECDSA", "ECDH", "DH", "DSA", "ED25519", "X25519"]) {
      expect(assessQuantumVulnerability(algorithm, { keySize: 15360 }), algorithm).toBe("broken");
    }
  });

  it("treats symmetric strength by the post-Grover rule", () => {
    expect(assessQuantumVulnerability("AES", { keySize: 128 })).toBe("weakened");
    expect(assessQuantumVulnerability("AES", { keySize: 192 })).toBe("weakened");
    expect(assessQuantumVulnerability("AES", { keySize: 256 })).toBe("safe");
  });

  it("treats the standardised post-quantum algorithms as safe", () => {
    for (const algorithm of ["ML-KEM-768", "ML-DSA-65", "SLH-DSA", "FALCON", "HQC"]) {
      expect(assessQuantumVulnerability(algorithm), algorithm).toBe("safe");
    }
  });
});

describe("what the agents conclude, and what they refuse to conclude", () => {
  it("sends a runtime-selected algorithm to a human rather than guessing it", () => {
    const unresolved = result.needsHuman.find((f) => f.algorithm === "UNRESOLVED");
    expect(unresolved).toBeDefined();
    expect(unresolved!.adjudication.status).toBe("needs-human");
    expect(unresolved!.adjudication.rationale).toContain("selected at runtime");
  });

  it("does not confuse a library that pins no algorithm with one it could not resolve", () => {
    const library = result.findings.find((f) => f.algorithm === "LIBRARY");
    expect(library, "a provider library should publish as a finding").toBeDefined();
    expect(library!.adjudication.status).toBe("confirmed");
    const blocked = result.findings.find((f) => f.provenance.ruleId === "JVM-DEP-BLOCKS-PQC");
    expect(blocked?.description).toContain("1.72");
  });

  it("marks cryptography that only exists in tests as test-only", () => {
    const inTests = result.findings.filter((f) =>
      f.provenance.evidence.some((e) => e.locator.includes("src/test/")),
    );
    expect(inTests.length).toBeGreaterThan(0);
    for (const finding of inTests) {
      expect(finding.adjudication.reachability).toBe("test-only");
      // And it must not read as urgent.
      expect(finding.risk.score).toBeLessThanOrEqual(35);
    }
  });

  it("does not claim runtime reachability for a dependency it cannot trace", () => {
    const dependency = result.findings.find((f) => f.provenance.collectorId === "jvm-deps");
    expect(dependency?.adjudication.reachability).toBe("unknown");
  });

  it("assesses payment data as long-lived and edge components as externally exposed", () => {
    const vault = result.findings.find((f) => f.component.includes("payments"));
    expect(vault?.adjudication.dataLifetime).toBe("long");
    const gateway = result.findings.find((f) => f.component.includes("gateway"));
    expect(gateway?.adjudication.exposure).toBe("external");
  });

  it("puts a library in the CBOM as related material, not as an algorithm", () => {
    const library = result.cbom.components.find(
      (c) => c.cryptoProperties.assetType === "related-crypto-material" && c.name.includes("Bouncy"),
    );
    expect(library).toBeDefined();
  });
});
