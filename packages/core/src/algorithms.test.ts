import { describe, expect, it } from "vitest";
import {
  algorithmById,
  assessQuantumVulnerability,
  parseTransformation,
  pqcReplacementFor,
  ALGORITHMS,
} from "./algorithms.js";

describe("parseTransformation", () => {
  it("splits a JCA transformation into algorithm, mode and padding", () => {
    const parsed = parseTransformation("AES/GCM/NoPadding");
    expect(parsed.algorithm).toBe("AES");
    expect(parsed.mode).toBe("GCM");
    expect(parsed.padding).toBe("NoPadding");
    expect(parsed.entry?.primitive).toBe("block-cipher");
  });

  it("resolves a signature name to the signing algorithm and its digest", () => {
    const parsed = parseTransformation("SHA256withRSA");
    expect(parsed.algorithm).toBe("RSASSA");
    expect(parsed.digest).toBe("SHA-256");
    expect(parsed.entry?.quantum).toBe("broken");
  });

  it("resolves ECDSA signatures", () => {
    expect(parseTransformation("SHA384withECDSA").algorithm).toBe("ECDSA");
  });

  it("resolves legacy aliases", () => {
    expect(parseTransformation("DESede/CBC/PKCS5Padding").algorithm).toBe("3DES");
    expect(parseTransformation("SHA1").algorithm).toBe("SHA-1");
  });

  it("keeps an unknown algorithm rather than guessing", () => {
    const parsed = parseTransformation("ACME-CIPHER/CBC/NoPadding");
    expect(parsed.algorithm).toBe("ACME-CIPHER");
    expect(parsed.entry).toBeUndefined();
  });
});

describe("assessQuantumVulnerability", () => {
  it("marks every RSA key size broken — Shor does not care about key length", () => {
    expect(assessQuantumVulnerability("RSA", { keySize: 2048 })).toBe("broken");
    expect(assessQuantumVulnerability("RSA", { keySize: 15360 })).toBe("broken");
  });

  it("treats AES-128 as weakened and AES-256 as safe", () => {
    expect(assessQuantumVulnerability("AES", { keySize: 128 })).toBe("weakened");
    expect(assessQuantumVulnerability("AES", { keySize: 256 })).toBe("safe");
  });

  it("treats ML-KEM as safe", () => {
    expect(assessQuantumVulnerability("ML-KEM-768")).toBe("safe");
    expect(assessQuantumVulnerability("Kyber768")).toBe("safe");
  });

  it("returns unknown for an algorithm outside the registry", () => {
    expect(assessQuantumVulnerability("ACME-CIPHER")).toBe("unknown");
  });
});

describe("pqcReplacementFor", () => {
  it("routes key transport and agreement to ML-KEM", () => {
    expect(pqcReplacementFor("RSA")).toBe("ML-KEM-768");
    expect(pqcReplacementFor("ECDH")).toBe("ML-KEM-768");
  });

  it("routes signatures to ML-DSA", () => {
    expect(pqcReplacementFor("ECDSA")).toBe("ML-DSA-65");
    expect(pqcReplacementFor("RSASSA")).toBe("ML-DSA-65");
  });

  it("routes symmetric ciphers to AES-256", () => {
    expect(pqcReplacementFor("AES", { keySize: 128 })).toBe("AES-256");
    expect(pqcReplacementFor("3DES")).toBe("AES-256");
  });

  it("proposes nothing for an algorithm already quantum-safe", () => {
    expect(pqcReplacementFor("AES", { keySize: 256 })).toBeUndefined();
    expect(pqcReplacementFor("ML-DSA-65")).toBeUndefined();
  });
});

describe("registry integrity", () => {
  it("has unique ids", () => {
    const ids = ALGORITHMS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("names a standard for every entry it claims is quantum-safe", () => {
    for (const entry of ALGORITHMS.filter((a) => a.quantum === "safe")) {
      expect(entry.reference, `${entry.id} must cite a standard`).toBeTruthy();
    }
  });

  it("points every replacement at an algorithm that exists", () => {
    for (const entry of ALGORITHMS) {
      if (!entry.pqcReplacement) continue;
      const target = entry.pqcReplacement.replace(/^AES-256$/, "AES");
      expect(algorithmById(target), `${entry.id} → ${entry.pqcReplacement}`).toBeTruthy();
    }
  });
});
