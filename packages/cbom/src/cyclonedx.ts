/**
 * CycloneDX 1.6 cryptographic-asset types, narrowed to what a CBOM needs.
 *
 * Hand-declared rather than pulled from a schema package so the shape the
 * platform emits is visible in one file and reviewable against the
 * specification — a CBOM is an artefact customers hand to auditors, so its
 * structure is part of the product, not an implementation detail.
 */

export type CycloneDxPrimitive =
  | "drbg"
  | "mac"
  | "block-cipher"
  | "stream-cipher"
  | "signature"
  | "hash"
  | "pke"
  | "xof"
  | "kdf"
  | "key-agree"
  | "kem"
  | "ae"
  | "combiner"
  | "other"
  | "unknown";

export type CryptoFunction =
  | "generate"
  | "keygen"
  | "encrypt"
  | "decrypt"
  | "digest"
  | "tag"
  | "keyderive"
  | "sign"
  | "verify"
  | "encapsulate"
  | "decapsulate"
  | "other"
  | "unknown";

export interface AlgorithmProperties {
  primitive: CycloneDxPrimitive;
  parameterSetIdentifier?: string;
  curve?: string;
  executionEnvironment: "software-plain-ram" | "hardware" | "other" | "unknown";
  implementationPlatform: "generic" | "x86_64" | "other" | "unknown";
  certificationLevel: string[];
  mode?: "cbc" | "ecb" | "ccm" | "gcm" | "cfb" | "ofb" | "ctr" | "other" | "unknown";
  padding?: "pkcs5" | "pkcs7" | "pkcs1v15" | "oaep" | "raw" | "other" | "unknown";
  cryptoFunctions: CryptoFunction[];
  /** 0 where the algorithm offers no post-quantum security. */
  nistQuantumSecurityLevel: 0 | 1 | 2 | 3 | 4 | 5;
}

export interface ProtocolProperties {
  type: "tls" | "ssh" | "ipsec" | "ike" | "sstp" | "wpa" | "other" | "unknown";
  version?: string;
  cipherSuites?: { name: string; algorithms?: string[] }[];
}

export interface CertificateProperties {
  subjectName?: string;
  issuerName?: string;
  notValidAfter?: string;
  signatureAlgorithmRef?: string;
  certificateFormat?: string;
}

export interface CryptoProperties {
  assetType: "algorithm" | "certificate" | "protocol" | "related-crypto-material";
  algorithmProperties?: AlgorithmProperties;
  protocolProperties?: ProtocolProperties;
  certificateProperties?: CertificateProperties;
  oid?: string;
}

export interface Occurrence {
  location: string;
  line?: number;
  symbol?: string;
  additionalContext?: string;
}

export interface CycloneDxComponent {
  type: "cryptographic-asset";
  "bom-ref": string;
  name: string;
  description?: string;
  cryptoProperties: CryptoProperties;
  evidence?: { occurrences: Occurrence[] };
  properties?: { name: string; value: string }[];
}

export interface CycloneDxBom {
  bomFormat: "CycloneDX";
  specVersion: "1.6";
  serialNumber: string;
  version: number;
  metadata: {
    timestamp: string;
    tools: { components: { type: "application"; name: string; version: string; publisher: string }[] };
    component: { type: "application"; "bom-ref": string; name: string; version?: string };
    properties?: { name: string; value: string }[];
  };
  components: CycloneDxComponent[];
  dependencies?: { ref: string; dependsOn: string[] }[];
}
