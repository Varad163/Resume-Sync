/**
 * Cryptographic detection rules for Python source files.
 *
 * Scans python source files line-by-line using regular expressions to detect
 * imports and invocations of common cryptographic modules (cryptography, pycryptodome, hashlib, hmac).
 */

import type { AmbiguityReason, CryptoPrimitive } from "@ironbastion/core";

export interface PythonDetection {
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

const RULES: readonly RuleDefinition[] = [
  // 1. cryptography.fernet
  {
    ruleId: "PYTHON-FERNET",
    pattern: /\bFernet\(/,
    primitive: "block-cipher",
    algorithm: "AES-CBC",
    note: "Fernet symmetric encryption (AES-128-CBC with HMAC-SHA256)",
  },
  {
    ruleId: "PYTHON-MULTIFERNET",
    pattern: /\bMultiFernet\(/,
    primitive: "block-cipher",
    algorithm: "AES-CBC",
    note: "Fernet symmetric multi-encryption",
  },

  // 2. cryptography.hazmat.primitives.ciphers (Cipher, algorithms, modes)
  {
    ruleId: "PYTHON-CIPHER-AES",
    pattern: /\balgorithms\.AES\(/,
    primitive: "block-cipher",
    algorithm: "AES",
    note: "AES symmetric encryption",
    extractAlg: (match, lineContent) => {
      const modeMatch = /\bmodes\.([a-zA-Z0-9]+)\(/.exec(lineContent);
      return modeMatch ? `AES-${modeMatch[1]!.toUpperCase()}` : "AES";
    },
  },
  {
    ruleId: "PYTHON-CIPHER-3DES",
    pattern: /\balgorithms\.TripleDES\(/,
    primitive: "block-cipher",
    algorithm: "3DES",
    note: "Triple DES symmetric encryption",
    extractAlg: (match, lineContent) => {
      const modeMatch = /\bmodes\.([a-zA-Z0-9]+)\(/.exec(lineContent);
      return modeMatch ? `3DES-${modeMatch[1]!.toUpperCase()}` : "3DES";
    },
  },
  {
    ruleId: "PYTHON-CIPHER-CAMELLIA",
    pattern: /\balgorithms\.Camellia\(/,
    primitive: "block-cipher",
    algorithm: "Camellia",
    note: "Camellia symmetric encryption",
    extractAlg: (match, lineContent) => {
      const modeMatch = /\bmodes\.([a-zA-Z0-9]+)\(/.exec(lineContent);
      return modeMatch ? `Camellia-${modeMatch[1]!.toUpperCase()}` : "Camellia";
    },
  },
  {
    ruleId: "PYTHON-CIPHER-CAST5",
    pattern: /\balgorithms\.CAST5\(/,
    primitive: "block-cipher",
    algorithm: "CAST5",
    note: "CAST5 symmetric encryption",
  },
  {
    ruleId: "PYTHON-CIPHER-SEED",
    pattern: /\balgorithms\.SEED\(/,
    primitive: "block-cipher",
    algorithm: "SEED",
    note: "SEED symmetric encryption",
  },

  // 3. pycryptodome symmetric
  {
    ruleId: "PYTHON-PYCRYPTODOME-AES",
    pattern: /\bAES\.new\(/,
    primitive: "block-cipher",
    algorithm: "AES",
    note: "AES symmetric encryption via PyCryptodome",
    extractAlg: (match, lineContent) => {
      const modeMatch = /\bAES\.MODE_([A-Z0-9]+)\b/.exec(lineContent);
      return modeMatch ? `AES-${modeMatch[1]}` : "AES";
    },
  },
  {
    ruleId: "PYTHON-PYCRYPTODOME-DES3",
    pattern: /\bDES3\.new\(/,
    primitive: "block-cipher",
    algorithm: "3DES",
    note: "Triple DES symmetric encryption via PyCryptodome",
    extractAlg: (match, lineContent) => {
      const modeMatch = /\bDES3\.MODE_([A-Z0-9]+)\b/.exec(lineContent);
      return modeMatch ? `3DES-${modeMatch[1]}` : "3DES";
    },
  },
  {
    ruleId: "PYTHON-PYCRYPTODOME-DES",
    pattern: /\bDES\.new\(/,
    primitive: "block-cipher",
    algorithm: "DES",
    note: "Single DES symmetric encryption (Legacy/Broken)",
  },
  {
    ruleId: "PYTHON-PYCRYPTODOME-ARC4",
    pattern: /\bARC4\.new\(/,
    primitive: "block-cipher",
    algorithm: "RC4",
    note: "RC4 stream cipher encryption (Legacy/Broken)",
  },

  // 4. Asymmetric algorithms (cryptography & pycryptodome)
  {
    ruleId: "PYTHON-ASYMM-RSA-GEN",
    pattern: /\brsa\.generate_private_key\(/,
    primitive: "public-key-encryption",
    algorithm: "RSA",
    note: "RSA private key generation",
  },
  {
    ruleId: "PYTHON-ASYMM-RSA-PYCRYPTODOME",
    pattern: /\bRSA\.generate\(/,
    primitive: "public-key-encryption",
    algorithm: "RSA",
    note: "RSA key generation via PyCryptodome",
  },
  {
    ruleId: "PYTHON-ASYMM-EC-GEN",
    pattern: /\bec\.generate_private_key\(/,
    primitive: "signature",
    algorithm: "ECDSA",
    note: "Elliptic curve key generation",
  },
  {
    ruleId: "PYTHON-ASYMM-DSA-GEN",
    pattern: /\bdsa\.generate_private_key\(/,
    primitive: "signature",
    algorithm: "DSA",
    note: "DSA private key generation",
  },
  {
    ruleId: "PYTHON-ASYMM-DH-GEN",
    pattern: /\bdh\.generate_parameters\(/,
    primitive: "key-agreement",
    algorithm: "DH",
    note: "Diffie-Hellman parameters generation",
  },

  // 5. hashlib & hmac
  {
    ruleId: "PYTHON-HASH",
    pattern: /\bhashlib\.(sha256|sha1|md5|sha512|sha384|sha224|sha3_256|sha3_512)\(/,
    primitive: "hash",
    algorithm: "SHA256",
    note: "Hash digest function",
    extractAlg: (match) => match[1]!.toUpperCase().replace("_", "-"),
  },
  {
    ruleId: "PYTHON-HASH-DYNAMIC",
    pattern: /\bhashlib\.new\(\s*['"]([a-zA-Z0-9_-]+)['"]/,
    primitive: "hash",
    algorithm: "unknown",
    note: "Dynamic hash digest function",
    extractAlg: (match) => match[1]!.toUpperCase().replace("_", "-"),
  },
  {
    ruleId: "PYTHON-HMAC",
    pattern: /\bhmac\.new\(/,
    primitive: "mac",
    algorithm: "HMAC",
    note: "HMAC authentication",
    extractAlg: (match, lineContent) => {
      const hashMatch = /hashlib\.(sha256|sha1|md5|sha512|sha384|sha224)/.exec(lineContent);
      return hashMatch ? `HMAC-${hashMatch[1]!.toUpperCase()}` : "HMAC";
    },
  },
];

export function scanPythonSource(content: string): PythonDetection[] {
  const detections: PythonDetection[] = [];
  const lines = content.split("\n");

  lines.forEach((lineText, index) => {
    const trimmed = lineText.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    for (const rule of RULES) {
      // Exec pattern
      const match = rule.pattern.exec(lineText);
      if (match) {
        const algorithm = rule.extractAlg ? rule.extractAlg(match, lineText) : rule.algorithm;
        detections.push({
          ruleId: rule.ruleId,
          algorithm,
          primitive: rule.primitive,
          line: index + 1,
          column: match.index + 1,
          confidence: 0.9,
          ambiguity: [],
          note: rule.note,
          snippet: trimmed,
        });
      }
    }
  });

  return detections;
}
