/** Translation from the platform's domain model into CycloneDX vocabulary. */

import {
  algorithmById,
  type CryptoParameters,
  type CryptoPrimitive,
  type QuantumVulnerability,
} from "@ironbastion/core";
import type { AlgorithmProperties, CryptoFunction, CycloneDxPrimitive } from "./cyclonedx.js";

const PRIMITIVE_MAP: Record<CryptoPrimitive, CycloneDxPrimitive> = {
  "public-key-encryption": "pke",
  "key-agreement": "key-agree",
  "key-encapsulation": "kem",
  signature: "signature",
  "block-cipher": "block-cipher",
  "stream-cipher": "stream-cipher",
  hash: "hash",
  mac: "mac",
  kdf: "kdf",
  drbg: "drbg",
  protocol: "other",
  certificate: "other",
  "key-store": "other",
  unknown: "unknown",
};

const FUNCTIONS_BY_PRIMITIVE: Record<CryptoPrimitive, CryptoFunction[]> = {
  "public-key-encryption": ["encrypt", "decrypt", "keygen"],
  "key-agreement": ["keyderive"],
  "key-encapsulation": ["encapsulate", "decapsulate"],
  signature: ["sign", "verify"],
  "block-cipher": ["encrypt", "decrypt"],
  "stream-cipher": ["encrypt", "decrypt"],
  hash: ["digest"],
  mac: ["tag"],
  kdf: ["keyderive"],
  drbg: ["generate"],
  protocol: ["other"],
  certificate: ["verify"],
  "key-store": ["other"],
  unknown: ["unknown"],
};

export function toCycloneDxPrimitive(primitive: CryptoPrimitive): CycloneDxPrimitive {
  return PRIMITIVE_MAP[primitive] ?? "unknown";
}

/**
 * NIST post-quantum security categories: 1 matches the brute-force resistance
 * of AES-128, 3 of AES-192, 5 of AES-256; 2 and 4 match SHA-256 and SHA-384
 * collision search. Anything Shor breaks is 0 — it offers no post-quantum
 * security at all, whatever its classical strength.
 */
export function nistSecurityLevel(
  algorithm: string,
  quantum: QuantumVulnerability,
  parameters: CryptoParameters,
): 0 | 1 | 2 | 3 | 4 | 5 {
  if (quantum === "broken" || quantum === "unknown") return 0;

  const entry = algorithmById(algorithm);
  const bits = parameters.keySize ?? entry?.classicalBits ?? 0;

  if (entry?.primitive === "hash") {
    if (bits >= 256) return 4;
    if (bits >= 192) return 4;
    return 2;
  }
  // Symmetric strength after Grover halves the search space.
  if (bits >= 256) return 5;
  if (bits >= 192) return 3;
  if (bits >= 128) return 1;
  return 0;
}

const MODES = new Set(["cbc", "ecb", "ccm", "gcm", "cfb", "ofb", "ctr"]);

export function toMode(mode?: string): AlgorithmProperties["mode"] {
  if (!mode) return undefined;
  const lower = mode.toLowerCase();
  return MODES.has(lower) ? (lower as AlgorithmProperties["mode"]) : "other";
}

export function toPadding(padding?: string): AlgorithmProperties["padding"] {
  if (!padding) return undefined;
  const lower = padding.toLowerCase().replace(/padding$/, "");
  if (lower.startsWith("pkcs5")) return "pkcs5";
  if (lower.startsWith("pkcs7")) return "pkcs7";
  if (lower.startsWith("pkcs1")) return "pkcs1v15";
  if (lower.startsWith("oaep")) return "oaep";
  if (lower === "no" || lower === "none") return "raw";
  return "other";
}

export function cryptoFunctionsFor(primitive: CryptoPrimitive): CryptoFunction[] {
  return FUNCTIONS_BY_PRIMITIVE[primitive] ?? ["unknown"];
}

/** A stable, human-readable bom-ref: two CBOMs of the same estate must line up. */
export function bomRefFor(algorithm: string, parameters: CryptoParameters): string {
  const suffix = [
    parameters.keySize ? `${parameters.keySize}` : undefined,
    parameters.curve,
    parameters.mode,
    parameters.protocolVersion,
  ]
    .filter(Boolean)
    .join("-");
  const slug = `${algorithm}${suffix ? `-${suffix}` : ""}`
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `crypto/algorithm/${slug}`;
}
