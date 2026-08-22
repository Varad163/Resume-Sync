import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import type { GitRepositoryTarget } from "@ironbastion/core";
import { jvmSourceCollector } from "./source-collector.js";
import type { CollectorContext } from "../shared/types.js";

const target: GitRepositoryTarget = {
  kind: "git-repository",
  id: "repo_fixture",
  name: "acme-payments",
  localPath: fileURLToPath(new URL("../../../../fixtures/java-payments", import.meta.url)),
};

const ctx: CollectorContext = {
  scanId: "scan_test",
  metadataOnly: false,
  now: () => "2026-08-22T00:00:00.000Z",
};

const collect = () => jvmSourceCollector.collect(target, ctx);

describe("jvmSourceCollector", () => {
  it("scans every Java file in the tree, across modules", async () => {
    const out = await collect();
    expect(out.unitsScanned).toBe(8);
    expect(out.notes).toEqual([]);
  });

  it("finds the RSA wrapping key and records its size", async () => {
    const { candidates } = await collect();
    const rsa = candidates.find(
      (c) => c.algorithm === "RSA" && c.provenance.ruleId === "JVM-KEYPAIR-GEN",
    );
    expect(rsa?.parameters.keySize).toBe(2048);
    expect(rsa?.quantum).toBe("broken");
  });

  it("attaches a hashed source excerpt with a real line range", async () => {
    const { candidates } = await collect();
    const evidence = candidates[0]?.provenance.evidence[0];
    expect(evidence?.kind).toBe("source-span");
    expect(evidence?.locator).toMatch(/\.java$/);
    expect(evidence?.snippetSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(evidence?.startLine).toBeGreaterThan(0);
    expect(evidence?.snippet).toBeTruthy();
  });

  it("withholds source text in metadata-only mode but keeps the hash", async () => {
    const out = await jvmSourceCollector.collect(target, { ...ctx, metadataOnly: true });
    for (const candidate of out.candidates) {
      for (const evidence of candidate.provenance.evidence) {
        expect(evidence.snippet).toBeUndefined();
        expect(evidence.snippetSha256).toMatch(/^[0-9a-f]{64}$/);
      }
    }
  });

  it("marks cryptography that only appears in tests", async () => {
    const { candidates } = await collect();
    const inTests = candidates.filter((c) =>
      c.provenance.evidence.some((e) => e.locator.includes("src/test/")),
    );
    expect(inTests.length).toBeGreaterThan(0);
    for (const candidate of inTests) {
      expect(candidate.ambiguity).toContain("test-scope");
    }
  });

  it("groups findings by the module they live in", async () => {
    const { candidates } = await collect();
    const components = new Set(candidates.map((c) => c.component));
    expect(components).toContain("acme-payments/.");
    expect(components).toContain("acme-payments/gateway");
  });

  it("reports the runtime-configured cipher rather than skipping it", async () => {
    const { candidates } = await collect();
    const dynamic = candidates.find((c) => c.algorithm === "UNRESOLVED");
    expect(dynamic).toBeDefined();
    expect(dynamic?.ambiguity).toContain("indirect-algorithm");
    expect(dynamic?.provenance.confidence).toBeLessThan(0.5);
  });

  it("classifies AES-256 as quantum-safe and AES-128 as weakened", async () => {
    const { candidates } = await collect();
    const aes256 = candidates.find((c) => c.parameters.keySize === 256 && c.algorithm === "AES");
    expect(aes256?.quantum).toBe("safe");
    const aesCbc = candidates.find(
      (c) => c.algorithm === "AES" && c.parameters.mode === "CBC",
    );
    expect(aesCbc?.quantum).toBe("weakened");
  });

  it("gives the same candidate the same id across runs", async () => {
    const first = await collect();
    const second = await collect();
    expect(first.candidates.map((c) => c.id)).toEqual(second.candidates.map((c) => c.id));
  });

  it("finds the legacy 3DES, MD5, SHA-1 and SHA1PRNG uses", async () => {
    const { candidates } = await collect();
    const algorithms = candidates.map((c) => c.algorithm);
    expect(algorithms).toContain("3DES");
    expect(algorithms).toContain("MD5");
    expect(algorithms).toContain("SHA-1");
    expect(algorithms).toContain("SHA1PRNG");
  });
});
