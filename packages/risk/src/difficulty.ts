/**
 * How hard a replacement is, on evidence rather than opinion.
 *
 * Difficulty is not severity — a hard migration is not a bigger risk, it is a
 * migration that has to start sooner. It enters the score at a low weight for
 * exactly that reason, and drives wave ordering in the plan.
 */

import type { Candidate, CryptoPrimitive } from "@ironbastion/core";

/** Base difficulty by what the primitive commits you to. */
const BY_PRIMITIVE: Record<CryptoPrimitive, number> = {
  // Someone else holds the pen: the CA issues the signature, the peer picks the suite.
  certificate: 0.85,
  protocol: 0.75,
  "key-agreement": 0.7,
  "key-encapsulation": 0.6,
  // Re-encrypting stored data means touching every record ever written.
  "public-key-encryption": 0.8,
  signature: 0.65,
  "key-store": 0.6,
  // A parameter change inside your own code.
  "block-cipher": 0.25,
  "stream-cipher": 0.25,
  hash: 0.3,
  mac: 0.3,
  kdf: 0.35,
  drbg: 0.2,
  unknown: 0.5,
};

export interface DifficultyAssessment {
  readonly score: number;
  readonly drivers: readonly string[];
}

export function estimateMigrationDifficulty(candidate: Candidate): DifficultyAssessment {
  const drivers: string[] = [];
  let score = BY_PRIMITIVE[candidate.primitive] ?? 0.5;
  drivers.push(`${candidate.primitive} baseline ${score.toFixed(2)}`);

  if (candidate.ambiguity.includes("wrapper-library")) {
    score += 0.15;
    drivers.push("algorithm is chosen by a third-party library, not by this code");
  }
  if (candidate.ambiguity.includes("indirect-algorithm")) {
    score += 0.1;
    drivers.push("algorithm is selected at runtime, so every configuration must be found");
  }
  if (candidate.provenance.ruleId === "JVM-DEP-BLOCKS-PQC") {
    score += 0.2;
    drivers.push("the declared library version cannot reach the standardised PQC algorithms");
  }
  if (candidate.parameters.provider) {
    score += 0.05;
    drivers.push(`pinned to JCE provider ${candidate.parameters.provider}`);
  }
  // A hard-coded key size or curve is one line; a protocol handshake is a negotiation.
  if (candidate.primitive === "block-cipher" && candidate.parameters.keySize) {
    score -= 0.05;
    drivers.push("key size is set explicitly and can be raised in place");
  }

  return { score: clamp(score), drivers };
}

export function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}
