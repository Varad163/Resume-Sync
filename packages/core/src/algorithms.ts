/**
 * The algorithm registry.
 *
 * Every conclusion the platform reaches about quantum exposure resolves back to
 * this table: what the primitive is, what breaks it, and what replaces it. It is
 * deliberately a plain data structure with pure lookups — no agent writes to it,
 * and no scoring rule may invent an entry that is not here.
 *
 * References are to the public standards, so a finding can always be defended:
 * FIPS 203 (ML-KEM), FIPS 204 (ML-DSA), FIPS 205 (SLH-DSA), FIPS 197 (AES),
 * FIPS 180-4 / 202 (SHA-2 / SHA-3), NIST SP 800-56A/B, RFC 8446 (TLS 1.3).
 */

/** What the algorithm is *for*. Drives CBOM classification and risk weighting. */
export type CryptoPrimitive =
  | "public-key-encryption"
  | "key-agreement"
  | "key-encapsulation"
  | "signature"
  | "block-cipher"
  | "stream-cipher"
  | "hash"
  | "mac"
  | "kdf"
  | "drbg"
  | "protocol"
  | "certificate"
  | "key-store"
  | "unknown";

/**
 * How a cryptographically relevant quantum computer changes the picture.
 *
 * `broken`   — Shor's algorithm reduces the hard problem to polynomial time.
 *              RSA, finite-field DH, and every elliptic-curve scheme.
 * `weakened` — Grover's algorithm halves the effective security level. A 128-bit
 *              symmetric key retains ~64 bits, which is not enough.
 * `safe`     — believed to resist both, at the parameter set in use.
 */
export type QuantumVulnerability = "broken" | "weakened" | "safe" | "unknown";

export interface AlgorithmEntry {
  /** Canonical identifier, uppercase, hyphenated. */
  readonly id: string;
  /** Human-facing name. */
  readonly name: string;
  readonly primitive: CryptoPrimitive;
  /** Vulnerability *before* parameters are considered. */
  readonly quantum: QuantumVulnerability;
  /**
   * Classical security strength in bits at the default parameter set, used to
   * derive the post-Grover position for symmetric primitives.
   */
  readonly classicalBits?: number;
  /** Post-quantum replacement, where one exists and is standardised. */
  readonly pqcReplacement?: string;
  /** Standard the algorithm is specified in. */
  readonly reference?: string;
  /** Alternate spellings seen in source, JCA names, OIDs and cipher suites. */
  readonly aliases?: readonly string[];
  /** True where the algorithm is deprecated on classical grounds alone. */
  readonly classicallyBroken?: boolean;
}

const ENTRIES: readonly AlgorithmEntry[] = [
  // ---------------------------------------------------------- asymmetric
  {
    id: "RSA",
    name: "RSA",
    primitive: "public-key-encryption",
    quantum: "broken",
    pqcReplacement: "ML-KEM-768",
    reference: "RFC 8017",
    aliases: ["RSA/ECB/PKCS1PADDING", "RSAES-OAEP", "RSA-OAEP", "1.2.840.113549.1.1.1"],
  },
  {
    id: "RSASSA",
    name: "RSA signature",
    primitive: "signature",
    quantum: "broken",
    pqcReplacement: "ML-DSA-65",
    reference: "RFC 8017",
    aliases: ["SHA256WITHRSA", "SHA1WITHRSA", "SHA384WITHRSA", "SHA512WITHRSA", "RSASSA-PSS", "MD5WITHRSA"],
  },
  {
    id: "ECDSA",
    name: "ECDSA",
    primitive: "signature",
    quantum: "broken",
    pqcReplacement: "ML-DSA-65",
    reference: "FIPS 186-5",
    aliases: ["SHA256WITHECDSA", "SHA384WITHECDSA", "SHA512WITHECDSA", "SHA1WITHECDSA", "EC"],
  },
  {
    id: "ECDH",
    name: "Elliptic-curve Diffie–Hellman",
    primitive: "key-agreement",
    quantum: "broken",
    pqcReplacement: "ML-KEM-768",
    reference: "NIST SP 800-56A",
    aliases: ["ECDHE", "ECIES"],
  },
  {
    id: "DH",
    name: "Finite-field Diffie–Hellman",
    primitive: "key-agreement",
    quantum: "broken",
    pqcReplacement: "ML-KEM-768",
    reference: "NIST SP 800-56A",
    aliases: ["DIFFIEHELLMAN", "DHE"],
  },
  {
    id: "DSA",
    name: "DSA",
    primitive: "signature",
    quantum: "broken",
    pqcReplacement: "ML-DSA-65",
    reference: "FIPS 186-4",
    aliases: ["SHA1WITHDSA", "SHA256WITHDSA"],
  },
  {
    id: "ED25519",
    name: "Ed25519",
    primitive: "signature",
    quantum: "broken",
    pqcReplacement: "ML-DSA-65",
    reference: "RFC 8032",
    aliases: ["EDDSA", "ED448"],
  },
  {
    id: "X25519",
    name: "X25519",
    primitive: "key-agreement",
    quantum: "broken",
    pqcReplacement: "ML-KEM-768",
    reference: "RFC 7748",
    aliases: ["X448", "CURVE25519"],
  },

  // ------------------------------------------------------- post-quantum
  {
    id: "ML-KEM-512",
    name: "ML-KEM-512",
    primitive: "key-encapsulation",
    quantum: "safe",
    classicalBits: 128,
    reference: "FIPS 203",
    aliases: ["KYBER512", "CRYSTALS-KYBER-512"],
  },
  {
    id: "ML-KEM-768",
    name: "ML-KEM-768",
    primitive: "key-encapsulation",
    quantum: "safe",
    classicalBits: 192,
    reference: "FIPS 203",
    aliases: ["KYBER768", "CRYSTALS-KYBER-768", "KYBER"],
  },
  {
    id: "ML-KEM-1024",
    name: "ML-KEM-1024",
    primitive: "key-encapsulation",
    quantum: "safe",
    classicalBits: 256,
    reference: "FIPS 203",
    aliases: ["KYBER1024", "CRYSTALS-KYBER-1024"],
  },
  {
    id: "ML-DSA-44",
    name: "ML-DSA-44",
    primitive: "signature",
    quantum: "safe",
    classicalBits: 128,
    reference: "FIPS 204",
    aliases: ["DILITHIUM2", "CRYSTALS-DILITHIUM-2"],
  },
  {
    id: "ML-DSA-65",
    name: "ML-DSA-65",
    primitive: "signature",
    quantum: "safe",
    classicalBits: 192,
    reference: "FIPS 204",
    aliases: ["DILITHIUM3", "CRYSTALS-DILITHIUM-3", "DILITHIUM"],
  },
  {
    id: "ML-DSA-87",
    name: "ML-DSA-87",
    primitive: "signature",
    quantum: "safe",
    classicalBits: 256,
    reference: "FIPS 204",
    aliases: ["DILITHIUM5", "CRYSTALS-DILITHIUM-5"],
  },
  {
    id: "SLH-DSA",
    name: "SLH-DSA",
    primitive: "signature",
    quantum: "safe",
    classicalBits: 192,
    reference: "FIPS 205",
    aliases: ["SPHINCS+", "SPHINCSPLUS", "SPHINCS"],
  },
  {
    id: "FALCON",
    name: "Falcon",
    primitive: "signature",
    quantum: "safe",
    classicalBits: 192,
    reference: "NIST additional signatures",
    aliases: ["FALCON-512", "FALCON-1024", "FN-DSA"],
  },
  {
    id: "HQC",
    name: "HQC",
    primitive: "key-encapsulation",
    quantum: "safe",
    classicalBits: 192,
    reference: "NIST fifth-round selection",
    aliases: ["HQC-128", "HQC-192", "HQC-256"],
  },

  // -------------------------------------------------------- symmetric
  {
    id: "AES",
    name: "AES",
    primitive: "block-cipher",
    quantum: "weakened",
    classicalBits: 128,
    pqcReplacement: "AES-256",
    reference: "FIPS 197",
    aliases: ["AES/GCM/NOPADDING", "AES/CBC/PKCS5PADDING", "RIJNDAEL"],
  },
  {
    id: "CHACHA20",
    name: "ChaCha20",
    primitive: "stream-cipher",
    quantum: "weakened",
    classicalBits: 256,
    reference: "RFC 8439",
    aliases: ["CHACHA20-POLY1305", "CHACHA"],
  },
  {
    id: "3DES",
    name: "Triple DES",
    primitive: "block-cipher",
    quantum: "broken",
    classicalBits: 112,
    classicallyBroken: true,
    pqcReplacement: "AES-256",
    reference: "NIST SP 800-67 (disallowed after 2023)",
    aliases: ["DESEDE", "TRIPLEDES", "DESEDE/CBC/PKCS5PADDING"],
  },
  {
    id: "DES",
    name: "DES",
    primitive: "block-cipher",
    quantum: "broken",
    classicalBits: 56,
    classicallyBroken: true,
    pqcReplacement: "AES-256",
    reference: "withdrawn",
    aliases: ["DES/CBC/PKCS5PADDING"],
  },
  {
    id: "RC4",
    name: "RC4",
    primitive: "stream-cipher",
    quantum: "broken",
    classicalBits: 40,
    classicallyBroken: true,
    pqcReplacement: "AES-256",
    reference: "prohibited by RFC 7465",
    aliases: ["ARCFOUR"],
  },
  {
    id: "BLOWFISH",
    name: "Blowfish",
    primitive: "block-cipher",
    quantum: "weakened",
    classicalBits: 128,
    classicallyBroken: true,
    pqcReplacement: "AES-256",
    reference: "legacy",
  },

  // ------------------------------------------------------------ hashes
  {
    id: "SHA-256",
    name: "SHA-256",
    primitive: "hash",
    quantum: "weakened",
    classicalBits: 128,
    pqcReplacement: "SHA-384",
    reference: "FIPS 180-4",
    aliases: ["SHA256", "SHA2-256"],
  },
  {
    id: "SHA-384",
    name: "SHA-384",
    primitive: "hash",
    quantum: "safe",
    classicalBits: 192,
    reference: "FIPS 180-4",
    aliases: ["SHA384", "SHA2-384"],
  },
  {
    id: "SHA-512",
    name: "SHA-512",
    primitive: "hash",
    quantum: "safe",
    classicalBits: 256,
    reference: "FIPS 180-4",
    aliases: ["SHA512", "SHA2-512"],
  },
  {
    id: "SHA3-256",
    name: "SHA3-256",
    primitive: "hash",
    quantum: "weakened",
    classicalBits: 128,
    pqcReplacement: "SHA3-384",
    reference: "FIPS 202",
    aliases: ["SHA3"],
  },
  {
    id: "SHA3-384",
    name: "SHA3-384",
    primitive: "hash",
    quantum: "safe",
    classicalBits: 192,
    reference: "FIPS 202",
    aliases: ["SHA3384"],
  },
  {
    id: "SHA-1",
    name: "SHA-1",
    primitive: "hash",
    quantum: "broken",
    classicalBits: 63,
    classicallyBroken: true,
    pqcReplacement: "SHA-384",
    reference: "withdrawn by NIST in 2030 guidance; collisions demonstrated 2017",
    aliases: ["SHA1"],
  },
  {
    id: "MD5",
    name: "MD5",
    primitive: "hash",
    quantum: "broken",
    classicalBits: 18,
    classicallyBroken: true,
    pqcReplacement: "SHA-384",
    reference: "prohibited by RFC 6151",
  },

  // -------------------------------------------------------- mac / kdf
  {
    id: "HMAC-SHA256",
    name: "HMAC-SHA256",
    primitive: "mac",
    quantum: "weakened",
    classicalBits: 128,
    reference: "RFC 2104",
    aliases: ["HMACSHA256"],
  },
  {
    id: "HMAC-SHA1",
    name: "HMAC-SHA1",
    primitive: "mac",
    quantum: "weakened",
    classicalBits: 80,
    classicallyBroken: true,
    pqcReplacement: "HMAC-SHA384",
    reference: "RFC 2104",
    aliases: ["HMACSHA1"],
  },
  {
    id: "HMAC-SHA384",
    name: "HMAC-SHA384",
    primitive: "mac",
    quantum: "safe",
    classicalBits: 192,
    reference: "RFC 2104",
    aliases: ["HMACSHA384"],
  },
  {
    id: "PBKDF2",
    name: "PBKDF2",
    primitive: "kdf",
    quantum: "weakened",
    classicalBits: 128,
    reference: "RFC 8018",
    aliases: ["PBKDF2WITHHMACSHA1", "PBKDF2WITHHMACSHA256"],
  },
  {
    id: "HKDF",
    name: "HKDF",
    primitive: "kdf",
    quantum: "weakened",
    classicalBits: 128,
    reference: "RFC 5869",
  },

  // ------------------------------------------------------------ drbg
  {
    id: "SHA1PRNG",
    name: "SHA1PRNG",
    primitive: "drbg",
    quantum: "weakened",
    classicalBits: 80,
    classicallyBroken: true,
    reference: "implementation-defined; not a NIST DRBG",
  },
  {
    id: "DRBG",
    name: "NIST DRBG",
    primitive: "drbg",
    quantum: "weakened",
    classicalBits: 128,
    reference: "NIST SP 800-90A",
    aliases: ["HASH-DRBG", "HMAC-DRBG", "CTR-DRBG", "NATIVEPRNG", "DEFAULT"],
  },

  // -------------------------------------------------------- protocols
  {
    id: "TLS1.3-HYBRID",
    name: "TLS 1.3 with hybrid key exchange",
    primitive: "protocol",
    quantum: "safe",
    classicalBits: 192,
    reference: "RFC 8446 with the X25519MLKEM768 group (draft-kwiatkowski-tls-ecdhe-mlkem)",
    aliases: ["X25519MLKEM768", "TLS13-HYBRID", "SECP256R1MLKEM768"],
  },
  {
    id: "TLS1.3",
    name: "TLS 1.3",
    primitive: "protocol",
    quantum: "broken",
    pqcReplacement: "TLS1.3-HYBRID",
    reference: "RFC 8446",
    aliases: ["TLSV1.3"],
  },
  {
    id: "TLS1.2",
    name: "TLS 1.2",
    primitive: "protocol",
    quantum: "broken",
    pqcReplacement: "TLS1.3-HYBRID",
    reference: "RFC 5246",
    aliases: ["TLSV1.2", "TLS"],
  },
  {
    id: "TLS1.1",
    name: "TLS 1.1",
    primitive: "protocol",
    quantum: "broken",
    pqcReplacement: "TLS1.3-HYBRID",
    classicallyBroken: true,
    reference: "deprecated by RFC 8996",
    aliases: ["TLSV1.1"],
  },
  {
    id: "TLS1.0",
    name: "TLS 1.0",
    primitive: "protocol",
    quantum: "broken",
    pqcReplacement: "TLS1.3-HYBRID",
    classicallyBroken: true,
    reference: "deprecated by RFC 8996",
    aliases: ["TLSV1", "TLSV1.0"],
  },
  {
    id: "SSL3.0",
    name: "SSL 3.0",
    primitive: "protocol",
    quantum: "broken",
    pqcReplacement: "TLS1.3-HYBRID",
    classicallyBroken: true,
    reference: "prohibited by RFC 7568",
    aliases: ["SSLV3", "SSL"],
  },
];

const BY_ID = new Map<string, AlgorithmEntry>();
const BY_ALIAS = new Map<string, AlgorithmEntry>();

for (const entry of ENTRIES) {
  BY_ID.set(entry.id.toUpperCase(), entry);
  BY_ALIAS.set(entry.id.toUpperCase(), entry);
  BY_ALIAS.set(entry.id.replace(/-/g, "").toUpperCase(), entry);
  for (const alias of entry.aliases ?? []) {
    BY_ALIAS.set(alias.toUpperCase(), entry);
    BY_ALIAS.set(alias.replace(/-/g, "").toUpperCase(), entry);
  }
}

export const ALGORITHMS: readonly AlgorithmEntry[] = ENTRIES;

export function algorithmById(id: string): AlgorithmEntry | undefined {
  return BY_ID.get(id.toUpperCase());
}

/** Parsed shape of a JCA transformation such as `AES/GCM/NoPadding`. */
export interface ParsedTransformation {
  readonly algorithm: string;
  readonly mode?: string;
  readonly padding?: string;
  readonly digest?: string;
  readonly entry?: AlgorithmEntry;
}

/**
 * Resolves the many spellings cryptography arrives in — a JCA transformation
 * string, a signature name like `SHA256withRSA`, a cipher suite fragment, an
 * OID — to a registry entry plus its parameters.
 */
export function parseTransformation(raw: string): ParsedTransformation {
  const cleaned = raw.trim().replace(/^"|"$/g, "");
  const [head = "", mode, padding] = cleaned.split("/");

  // `SHA256withRSA`, `SHA1withECDSA`, `MD5withRSA`
  const withMatch = /^(.+?)with(.+?)(?:and.+)?$/i.exec(head);
  if (withMatch) {
    const digest = withMatch[1] ?? "";
    const signer = withMatch[2] ?? "";
    const entry = BY_ALIAS.get(head.toUpperCase()) ?? signatureEntryFor(signer);
    return {
      algorithm: entry?.id ?? signer.toUpperCase(),
      digest: normaliseDigest(digest),
      ...(mode ? { mode } : {}),
      ...(padding ? { padding } : {}),
      ...(entry ? { entry } : {}),
    };
  }

  const entry = BY_ALIAS.get(cleaned.toUpperCase()) ?? BY_ALIAS.get(head.toUpperCase());
  return {
    algorithm: entry?.id ?? head.toUpperCase(),
    ...(mode ? { mode: mode.toUpperCase() } : {}),
    ...(padding ? { padding } : {}),
    ...(entry ? { entry } : {}),
  };
}

function signatureEntryFor(signer: string): AlgorithmEntry | undefined {
  const key = signer.toUpperCase();
  if (key === "RSA") return BY_ID.get("RSASSA");
  if (key === "ECDSA" || key === "EC") return BY_ID.get("ECDSA");
  if (key === "DSA") return BY_ID.get("DSA");
  return BY_ALIAS.get(key);
}

function normaliseDigest(digest: string): string {
  const entry = BY_ALIAS.get(digest.toUpperCase());
  return entry?.id ?? digest.toUpperCase();
}

/**
 * The vulnerability of a concrete instance, once its parameters are known.
 *
 * Parameters matter: AES is `weakened` in general but AES-256 retains 128 bits
 * against Grover and is treated as `safe`; RSA is `broken` at every key size.
 */
export function assessQuantumVulnerability(
  algorithm: string,
  params: { keySize?: number; curve?: string } = {},
): QuantumVulnerability {
  const entry = BY_ALIAS.get(algorithm.toUpperCase());
  if (!entry) return "unknown";
  if (entry.quantum !== "weakened") return entry.quantum;

  const effective = params.keySize ?? entry.classicalBits;
  if (effective === undefined) return "weakened";
  // Grover halves the effective strength of a symmetric search.
  return effective >= 256 ? "safe" : "weakened";
}

/** The standardised replacement for an algorithm at a given parameter set. */
export function pqcReplacementFor(
  algorithm: string,
  params: { keySize?: number } = {},
): string | undefined {
  const entry = BY_ALIAS.get(algorithm.toUpperCase());
  if (!entry) return undefined;
  if (assessQuantumVulnerability(algorithm, params) === "safe") return undefined;
  if (entry.primitive === "block-cipher" || entry.primitive === "stream-cipher") {
    return "AES-256";
  }
  return entry.pqcReplacement;
}
