/**
 * Cryptographically relevant JVM libraries.
 *
 * A dependency is worth reporting when it *is* cryptography (a provider), when
 * it *chooses* cryptography on the application's behalf (a JWT or TLS client
 * library with a default algorithm), or when the version in use constrains what
 * the application can migrate to. Everything else is noise and stays out.
 */

import type { CryptoPrimitive } from "@ironbastion/core";

export interface LibraryEntry {
  /** `groupId:artifactId`, with `*` permitted as the artifact suffix wildcard. */
  readonly coordinate: string;
  readonly name: string;
  readonly primitive: CryptoPrimitive;
  readonly role: string;
  /**
   * Minimum version that can emit or verify the standardised PQC suite. Absent
   * where the library does not implement algorithms itself.
   */
  readonly pqcCapableFrom?: string;
  /** Default algorithm the library uses when the application does not choose. */
  readonly defaultAlgorithm?: string;
  readonly notes?: string;
}

export const LIBRARIES: readonly LibraryEntry[] = [
  {
    coordinate: "org.bouncycastle:bcprov-*",
    name: "Bouncy Castle provider",
    primitive: "unknown",
    role: "JCE cryptographic provider",
    pqcCapableFrom: "1.72",
    notes:
      "Implements the algorithms the application selects. ML-KEM and ML-DSA are available from 1.72 onwards, so the provider version is a hard ceiling on migration.",
  },
  {
    coordinate: "org.bouncycastle:bcpkix-*",
    name: "Bouncy Castle PKIX",
    primitive: "certificate",
    role: "Certificate and CMS handling",
    pqcCapableFrom: "1.72",
  },
  {
    coordinate: "io.jsonwebtoken:jjwt-*",
    name: "JJWT",
    primitive: "signature",
    role: "JWT signing and verification",
    defaultAlgorithm: "RSASSA",
    notes: "RS256 and ES256 are quantum-vulnerable; JWT has no standardised PQC algorithm yet.",
  },
  {
    coordinate: "com.auth0:java-jwt",
    name: "java-jwt",
    primitive: "signature",
    role: "JWT signing and verification",
    defaultAlgorithm: "RSASSA",
  },
  {
    coordinate: "org.apache.httpcomponents:httpclient",
    name: "Apache HttpClient",
    primitive: "protocol",
    role: "TLS client",
    notes: "4.x negotiates through the JSSE provider; the JDK decides the group and suite.",
  },
  {
    coordinate: "com.squareup.okhttp3:okhttp",
    name: "OkHttp",
    primitive: "protocol",
    role: "TLS client",
  },
  {
    coordinate: "io.netty:netty-handler",
    name: "Netty TLS handler",
    primitive: "protocol",
    role: "TLS termination and client",
  },
  {
    coordinate: "org.eclipse.jetty:jetty-server",
    name: "Jetty",
    primitive: "protocol",
    role: "TLS termination",
  },
  {
    coordinate: "org.springframework.security:spring-security-crypto",
    name: "Spring Security Crypto",
    primitive: "kdf",
    role: "Password hashing and key derivation",
    defaultAlgorithm: "PBKDF2",
  },
  {
    coordinate: "org.mindrot:jbcrypt",
    name: "jBCrypt",
    primitive: "kdf",
    role: "Password hashing",
  },
  {
    coordinate: "com.google.crypto.tink:tink",
    name: "Tink",
    primitive: "unknown",
    role: "Opinionated cryptography library",
    notes: "Chooses algorithms through key templates; the template names the algorithm, not the call site.",
  },
  {
    coordinate: "org.apache.santuario:xmlsec",
    name: "Apache XML Security",
    primitive: "signature",
    role: "XML signature and encryption",
    defaultAlgorithm: "RSASSA",
  },
];

/** Known-vulnerable version floors, kept separate from capability. */
const MINIMUM_SAFE_VERSIONS: Record<string, { version: string; reason: string }> = {
  "org.bouncycastle:bcprov-*": {
    version: "1.78",
    reason:
      "Releases before 1.78 carry published advisories, including timing side channels in the ECDSA and RSA paths.",
  },
};

export function matchLibrary(groupId: string, artifactId: string): LibraryEntry | undefined {
  const coordinate = `${groupId}:${artifactId}`;
  return LIBRARIES.find((entry) => {
    if (entry.coordinate === coordinate) return true;
    if (!entry.coordinate.endsWith("*")) return false;
    return coordinate.startsWith(entry.coordinate.slice(0, -1));
  });
}

export function outdatedReason(
  entry: LibraryEntry,
  version: string,
): { version: string; reason: string } | undefined {
  const floor = MINIMUM_SAFE_VERSIONS[entry.coordinate];
  if (!floor) return undefined;
  return compareVersions(version, floor.version) < 0 ? floor : undefined;
}

/** True when the version cannot reach the standardised PQC algorithms. */
export function blocksPqcMigration(entry: LibraryEntry, version: string): boolean {
  if (!entry.pqcCapableFrom) return false;
  return compareVersions(version, entry.pqcCapableFrom) < 0;
}

/** Numeric-segment comparison; unparseable segments sort as 0. */
export function compareVersions(a: string, b: string): number {
  const parse = (v: string) =>
    v
      .split(/[.\-_]/)
      .map((part) => Number.parseInt(part, 10))
      .map((n) => (Number.isNaN(n) ? 0 : n));
  const left = parse(a);
  const right = parse(b);
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i++) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) return diff < 0 ? -1 : 1;
  }
  return 0;
}
