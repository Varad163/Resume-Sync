/**
 * Cryptographic detection rules for JavaScript/TypeScript source files.
 *
 * Scans JS/TS files line-by-line using regular expressions to detect
 * invocations of Node.js crypto and Web Crypto subtle APIs.
 */

import type { AmbiguityReason, CryptoPrimitive } from "@ironbastion/core";

export interface JsDetection {
  readonly ruleId: string;
  readonly algorithm: string;
  readonly primitive: CryptoPrimitive;
  readonly line: number;
  readonly column: number;
  readonly confidence: number;
  readonly ambiguity: readonly AmbiguityReason[];
  readonly note: string;
  readonly snippet: string;
}

interface RuleDefinition {
  readonly ruleId: string;
  readonly pattern: RegExp;
  readonly primitive: CryptoPrimitive;
  readonly algorithm: string;
  readonly note: string;
  readonly confidence?: number;
  readonly extractAlg?: (match: RegExpExecArray, lineContent: string) => string;
}

/** Helper to extract algorithm string from Web Crypto subtle algorithm parameter (string or object). */
function extractSubtleAlgorithm(methodName: string, lineContent: string): string {
  const methodIndex = lineContent.indexOf(methodName);
  if (methodIndex === -1) return "unknown";

  const paramArea = lineContent.substring(methodIndex + methodName.length);
  // Match string literal: subtle.digest("SHA-256", ...)
  const stringMatch = /^\s*\(\s*['"`]([a-zA-Z0-9_-]+)['"`]/.exec(paramArea);
  if (stringMatch) {
    return stringMatch[1]!.toUpperCase();
  }

  // Match object literal: subtle.encrypt({ name: "AES-GCM", ... }, ...)
  const objectMatch = /^\s*\(\s*\{\s*[^}]*\bname\s*:\s*['"`]([a-zA-Z0-9_-]+)['"`]/.exec(paramArea);
  if (objectMatch) {
    return objectMatch[1]!.toUpperCase();
  }

  return "unknown";
}

const RULES: readonly RuleDefinition[] = [
  // 1. Node.js Cipher/Decipher
  {
    ruleId: "JS-CIPHER",
    pattern: /\bcreateCipheriv\(/,
    primitive: "block-cipher",
    algorithm: "unknown",
    note: "Symmetric encryption via Node.js crypto.createCipheriv",
    extractAlg: (match, lineContent) => {
      const idx = lineContent.indexOf("createCipheriv(");
      const sub = lineContent.substring(idx + 15);
      const strMatch = /^\s*['"`]([a-zA-Z0-9_-]+)['"`]/.exec(sub);
      return strMatch ? strMatch[1]!.toUpperCase() : "unknown";
    },
  },
  {
    ruleId: "JS-DECIPHER",
    pattern: /\bcreateDecipheriv\(/,
    primitive: "block-cipher",
    algorithm: "unknown",
    note: "Symmetric decryption via Node.js crypto.createDecipheriv",
    extractAlg: (match, lineContent) => {
      const idx = lineContent.indexOf("createDecipheriv(");
      const sub = lineContent.substring(idx + 17);
      const strMatch = /^\s*['"`]([a-zA-Z0-9_-]+)['"`]/.exec(sub);
      return strMatch ? strMatch[1]!.toUpperCase() : "unknown";
    },
  },

  // 2. Node.js Hash/HMAC
  {
    ruleId: "JS-HASH",
    pattern: /\bcreateHash\(/,
    primitive: "hash",
    algorithm: "unknown",
    note: "Hash function via Node.js crypto.createHash",
    extractAlg: (match, lineContent) => {
      const idx = lineContent.indexOf("createHash(");
      const sub = lineContent.substring(idx + 11);
      const strMatch = /^\s*['"`]([a-zA-Z0-9_-]+)['"`]/.exec(sub);
      return strMatch ? strMatch[1]!.toUpperCase() : "unknown";
    },
  },
  {
    ruleId: "JS-HMAC",
    pattern: /\bcreateHmac\(/,
    primitive: "mac",
    algorithm: "unknown",
    note: "HMAC via Node.js crypto.createHmac",
    extractAlg: (match, lineContent) => {
      const idx = lineContent.indexOf("createHmac(");
      const sub = lineContent.substring(idx + 11);
      const strMatch = /^\s*['"`]([a-zA-Z0-9_-]+)['"`]/.exec(sub);
      return strMatch ? strMatch[1]!.toUpperCase() : "unknown";
    },
  },

  // 3. Node.js Key Generation and Sign/Verify
  {
    ruleId: "JS-KEYPAIR-GEN",
    pattern: /\bgenerateKeyPair(Sync)?\(/,
    primitive: "public-key-encryption",
    algorithm: "unknown",
    note: "Key pair generation via Node.js crypto.generateKeyPair",
    extractAlg: (match, lineContent) => {
      const isSync = match[0].includes("Sync");
      const idx = lineContent.indexOf(isSync ? "generateKeyPairSync(" : "generateKeyPair(");
      const sub = lineContent.substring(idx + (isSync ? 20 : 16));
      const strMatch = /^\s*['"`]([a-zA-Z0-9_-]+)['"`]/.exec(sub);
      return strMatch ? strMatch[1]!.toUpperCase() : "unknown";
    },
  },
  {
    ruleId: "JS-SIGN",
    pattern: /\bcreateSign\(/,
    primitive: "signature",
    algorithm: "unknown",
    note: "Digital signature creation via Node.js crypto.createSign",
    extractAlg: (match, lineContent) => {
      const idx = lineContent.indexOf("createSign(");
      const sub = lineContent.substring(idx + 11);
      const strMatch = /^\s*['"`]([a-zA-Z0-9_-]+)['"`]/.exec(sub);
      return strMatch ? strMatch[1]!.toUpperCase() : "unknown";
    },
  },
  {
    ruleId: "JS-VERIFY",
    pattern: /\bcreateVerify\(/,
    primitive: "signature",
    algorithm: "unknown",
    note: "Digital signature verification via Node.js crypto.createVerify",
    extractAlg: (match, lineContent) => {
      const idx = lineContent.indexOf("createVerify(");
      const sub = lineContent.substring(idx + 13);
      const strMatch = /^\s*['"`]([a-zA-Z0-9_-]+)['"`]/.exec(sub);
      return strMatch ? strMatch[1]!.toUpperCase() : "unknown";
    },
  },
  {
    ruleId: "JS-DH",
    pattern: /\bdiffieHellman\(/,
    primitive: "key-agreement",
    algorithm: "DH",
    note: "Diffie-Hellman key agreement via Node.js crypto.diffieHellman",
  },

  // 4. Web Crypto Subtle API
  {
    ruleId: "JS-WEB-ENCRYPT",
    pattern: /\.subtle\.encrypt\(/,
    primitive: "block-cipher",
    algorithm: "unknown",
    note: "Encryption via Web Crypto subtle.encrypt",
    extractAlg: (match, lineContent) => extractSubtleAlgorithm("subtle.encrypt", lineContent),
  },
  {
    ruleId: "JS-WEB-DECRYPT",
    pattern: /\.subtle\.decrypt\(/,
    primitive: "block-cipher",
    algorithm: "unknown",
    note: "Decryption via Web Crypto subtle.decrypt",
    extractAlg: (match, lineContent) => extractSubtleAlgorithm("subtle.decrypt", lineContent),
  },
  {
    ruleId: "JS-WEB-DIGEST",
    pattern: /\.subtle\.digest\(/,
    primitive: "hash",
    algorithm: "unknown",
    note: "Hash digest via Web Crypto subtle.digest",
    extractAlg: (match, lineContent) => extractSubtleAlgorithm("subtle.digest", lineContent),
  },
  {
    ruleId: "JS-WEB-SIGN",
    pattern: /\.subtle\.sign\(/,
    primitive: "signature",
    algorithm: "unknown",
    note: "Digital signature via Web Crypto subtle.sign",
    extractAlg: (match, lineContent) => extractSubtleAlgorithm("subtle.sign", lineContent),
  },
  {
    ruleId: "JS-WEB-VERIFY",
    pattern: /\.subtle\.verify\(/,
    primitive: "signature",
    algorithm: "unknown",
    note: "Signature verification via Web Crypto subtle.verify",
    extractAlg: (match, lineContent) => extractSubtleAlgorithm("subtle.verify", lineContent),
  },
  {
    ruleId: "JS-WEB-GEN-KEY",
    pattern: /\.subtle\.generateKey\(/,
    primitive: "public-key-encryption",
    algorithm: "unknown",
    note: "Key generation via Web Crypto subtle.generateKey",
    extractAlg: (match, lineContent) => extractSubtleAlgorithm("subtle.generateKey", lineContent),
  },
  {
    ruleId: "JS-WEB-DERIVE-KEY",
    pattern: /\.subtle\.deriveKey\(/,
    primitive: "kdf",
    algorithm: "unknown",
    note: "Key derivation via Web Crypto subtle.deriveKey",
    extractAlg: (match, lineContent) => extractSubtleAlgorithm("subtle.deriveKey", lineContent),
  },
  {
    ruleId: "JS-WEB-DERIVE-BITS",
    pattern: /\.subtle\.deriveBits\(/,
    primitive: "kdf",
    algorithm: "unknown",
    note: "Bits derivation via Web Crypto subtle.deriveBits",
    extractAlg: (match, lineContent) => extractSubtleAlgorithm("subtle.deriveBits", lineContent),
  },
];

export function scanJsSource(content: string): JsDetection[] {
  const detections: JsDetection[] = [];
  const lines = content.split("\n");

  lines.forEach((lineText, index) => {
    const trimmed = lineText.trim();
    // Skip comments
    if (
      !trimmed ||
      trimmed.startsWith("//") ||
      trimmed.startsWith("*") ||
      trimmed.startsWith("/*") ||
      trimmed.startsWith("*/")
    ) {
      return;
    }

    for (const rule of RULES) {
      const match = rule.pattern.exec(lineText);
      if (match) {
        let algorithm = rule.extractAlg ? rule.extractAlg(match, lineText) : rule.algorithm;
        // Standardise unresolved algorithm strings to "unknown"
        if (!algorithm || algorithm === "unknown") {
          algorithm = "unknown";
        }
        detections.push({
          ruleId: rule.ruleId,
          algorithm,
          primitive: rule.primitive,
          line: index + 1,
          column: match.index + 1,
          confidence: algorithm === "unknown" ? 0.45 : 0.9,
          ambiguity: algorithm === "unknown" ? ["indirect-algorithm"] : [],
          note: rule.note,
          snippet: trimmed,
        });
      }
    }
  });

  return detections;
}
