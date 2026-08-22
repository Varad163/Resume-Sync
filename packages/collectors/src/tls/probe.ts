/**
 * SENTINEL's TLS probe.
 *
 * Opens one handshake per endpoint and records what was actually negotiated —
 * protocol version, key exchange group, symmetric suite, and the certificate
 * chain's signature algorithms and key strengths. Source analysis cannot produce
 * these findings: what a service *negotiates* is a property of the deployed
 * estate, not of the code.
 *
 * The probe is read-only. It completes a handshake, reads the parameters, and
 * closes; it sends no application data and attempts no exploitation.
 */

import { connect, type TLSSocket } from "node:tls";
import {
  assessQuantumVulnerability,
  parseTransformation,
  sha256,
  stableCandidateId,
  type Candidate,
  type CryptoParameters,
  type ScanTarget,
  type TlsEndpointTarget,
} from "@ironbastion/core";
import type { Collector, CollectorContext, CollectorOutput } from "../shared/types.js";
import { decomposeSuite } from "./cipher-suites.js";
import { signatureAlgorithmOf } from "./asn1.js";

const VERSION = "1.0.0";
const HANDSHAKE_TIMEOUT_MS = 10_000;

export interface HandshakeObservation {
  readonly protocol: string;
  readonly cipherName: string;
  readonly cipherStandardName: string;
  readonly keyExchangeGroup?: string;
  readonly keyExchangeType?: string;
  readonly keyExchangeBits?: number;
  /** Groups the endpoint accepted during enumeration, in the order tried. */
  readonly supportedGroups: readonly string[];
  readonly certificates: readonly CertificateObservation[];
  readonly authorized: boolean;
  readonly authorizationError?: string;
}

export interface CertificateObservation {
  readonly subject: string;
  readonly issuer: string;
  readonly validTo: string;
  readonly signatureAlgorithm?: string;
  readonly signatureOid?: string;
  readonly publicKeyType?: string;
  readonly publicKeyBits?: number;
  readonly namedCurve?: string;
  readonly fingerprint256: string;
  readonly selfSigned: boolean;
}

/**
 * Key exchange groups worth asking about. TLS 1.3 does not tell a client which
 * group was negotiated — `getEphemeralKeyInfo()` is empty — so the only way to
 * learn what an endpoint will do is to offer one group at a time and see which
 * handshakes complete. That is also the more useful answer: the *set* of groups
 * an endpoint accepts is what decides whether a hybrid PQC group can be rolled
 * out without breaking clients.
 */
const CANDIDATE_GROUPS = ["X25519", "prime256v1", "secp384r1", "secp521r1"] as const;

export interface ProbeOptions {
  readonly timeoutMs?: number;
  /** Extra handshakes to enumerate accepted groups. One per group. */
  readonly enumerateGroups?: boolean;
}

export async function observeHandshake(
  target: TlsEndpointTarget,
  options: ProbeOptions | number = {},
): Promise<HandshakeObservation> {
  const settings: ProbeOptions = typeof options === "number" ? { timeoutMs: options } : options;
  const timeoutMs = settings.timeoutMs ?? HANDSHAKE_TIMEOUT_MS;
  const base = await singleHandshake(target, timeoutMs);
  if (settings.enumerateGroups === false) return base;

  const supportedGroups: string[] = [];
  for (const group of CANDIDATE_GROUPS) {
    if (await acceptsGroup(target, group, Math.min(timeoutMs, 4_000))) supportedGroups.push(group);
  }
  return { ...base, supportedGroups };
}

/** One handshake, one group offered. Failure means "not accepted", not an error. */
async function acceptsGroup(
  target: TlsEndpointTarget,
  group: string,
  timeoutMs: number,
): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({
      host: target.host,
      port: target.port,
      servername: target.serverName ?? target.host,
      rejectUnauthorized: false,
      timeout: timeoutMs,
      ecdhCurve: group,
    });
    const settle = (accepted: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(accepted);
    };
    socket.once("secureConnect", () => settle(true));
    socket.once("error", () => settle(false));
    socket.once("timeout", () => settle(false));
  });
}

function singleHandshake(
  target: TlsEndpointTarget,
  timeoutMs: number,
): Promise<HandshakeObservation> {
  return new Promise((resolve, reject) => {
    const socket: TLSSocket = connect({
      host: target.host,
      port: target.port,
      servername: target.serverName ?? target.host,
      // We are assessing what the endpoint offers, not trusting it. An
      // untrusted or expired chain is a finding, not a reason to abort.
      rejectUnauthorized: false,
      timeout: timeoutMs,
    });

    const fail = (error: Error) => {
      socket.destroy();
      reject(error);
    };

    socket.once("error", fail);
    socket.once("timeout", () => fail(new Error(`handshake timed out after ${timeoutMs}ms`)));

    socket.once("secureConnect", () => {
      try {
        const cipher = socket.getCipher();
        const ephemeral = socket.getEphemeralKeyInfo() as
          | { type?: string; name?: string; size?: number }
          | undefined;

        resolve({
          protocol: socket.getProtocol() ?? "unknown",
          cipherName: cipher?.name ?? "unknown",
          cipherStandardName: cipher?.standardName ?? cipher?.name ?? "unknown",
          ...(ephemeral?.name ? { keyExchangeGroup: ephemeral.name } : {}),
          ...(ephemeral?.type ? { keyExchangeType: ephemeral.type } : {}),
          ...(ephemeral?.size ? { keyExchangeBits: ephemeral.size } : {}),
          certificates: readChain(socket),
          supportedGroups: [],
          authorized: socket.authorized,
          ...(socket.authorizationError
            ? { authorizationError: String(socket.authorizationError) }
            : {}),
        });
      } catch (error) {
        reject(error as Error);
      } finally {
        socket.end();
      }
    });
  });
}

function readChain(socket: TLSSocket): CertificateObservation[] {
  const chain: CertificateObservation[] = [];
  const seen = new Set<string>();
  let current = socket.getPeerX509Certificate();

  while (current && !seen.has(current.fingerprint256)) {
    seen.add(current.fingerprint256);
    const signature = signatureAlgorithmOf(new Uint8Array(current.raw));
    const key = current.publicKey;
    const details = (key.asymmetricKeyDetails ?? {}) as {
      modulusLength?: number;
      namedCurve?: string;
    };

    chain.push({
      subject: current.subject.replace(/\n/g, ", "),
      issuer: current.issuer.replace(/\n/g, ", "),
      validTo: current.validTo,
      ...(signature?.name ? { signatureAlgorithm: signature.name } : {}),
      ...(signature?.oid ? { signatureOid: signature.oid } : {}),
      ...(key.asymmetricKeyType ? { publicKeyType: key.asymmetricKeyType } : {}),
      ...(details.modulusLength ? { publicKeyBits: details.modulusLength } : {}),
      ...(details.namedCurve ? { namedCurve: details.namedCurve } : {}),
      fingerprint256: current.fingerprint256,
      selfSigned: current.subject === current.issuer,
    });

    current = current.issuerCertificate ?? undefined;
  }

  return chain;
}

/** Builds candidates from an observation. Pure, so the mapping is unit-testable. */
export function candidatesFromHandshake(
  target: TlsEndpointTarget,
  observation: HandshakeObservation,
  ctx: CollectorContext,
): Candidate[] {
  const endpoint = `${target.host}:${target.port}`;
  const candidates: Candidate[] = [];
  const observedAt = ctx.now();

  const evidence = (locator: string, detail: string) => [
    {
      kind: "network-observation" as const,
      locator,
      ...(ctx.metadataOnly ? {} : { snippet: detail }),
      snippetSha256: sha256(detail),
      observedAt,
    },
  ];

  const add = (input: {
    ruleId: string;
    algorithm: string;
    parameters: CryptoParameters;
    title: string;
    description: string;
    confidence: number;
    detail: string;
  }) => {
    const parsed = parseTransformation(input.algorithm);
    candidates.push({
      id: stableCandidateId({
        component: endpoint,
        ruleId: input.ruleId,
        locator: endpoint,
        algorithm: input.algorithm,
      }),
      scanId: ctx.scanId,
      algorithm: parsed.entry?.id ?? input.algorithm,
      primitive: parsed.entry?.primitive ?? "protocol",
      parameters: input.parameters,
      quantum: assessQuantumVulnerability(input.algorithm, {
        ...(input.parameters.keySize !== undefined ? { keySize: input.parameters.keySize } : {}),
      }),
      title: input.title,
      description: input.description,
      component: endpoint,
      // A negotiated parameter is observed fact — there is nothing for an agent
      // to resolve about *what* it is. What it protects is still open.
      ambiguity: [],
      provenance: {
        source: "collector",
        collectorId: "tls-probe",
        collectorVersion: VERSION,
        ruleId: input.ruleId,
        confidence: input.confidence,
        evidence: evidence(endpoint, input.detail),
      },
    });
  };

  add({
    ruleId: "TLS-PROTOCOL",
    algorithm: observation.protocol,
    parameters: { protocolVersion: observation.protocol },
    title: `${observation.protocol} negotiated at ${endpoint}`,
    description: `The endpoint negotiated ${observation.protocol} with cipher suite ${observation.cipherStandardName}.`,
    confidence: 0.99,
    detail: `${observation.protocol} ${observation.cipherStandardName}`,
  });

  const suite = decomposeSuite(observation.cipherStandardName);

  const observedGroup = observation.keyExchangeGroup;
  const groups = observation.supportedGroups;
  if (observedGroup || groups.length > 0 || observation.keyExchangeType) {
    const algorithm =
      observation.keyExchangeType && !observation.keyExchangeType.toUpperCase().startsWith("ECDH")
        ? observation.keyExchangeType.toUpperCase()
        : "ECDH";
    const group = observedGroup ?? groups[0];
    const groupList = groups.length > 0 ? groups.join(", ") : (group ?? "not determined");
    add({
      ruleId: "TLS-KEY-EXCHANGE",
      algorithm,
      parameters: {
        ...(group ? { curve: group } : {}),
        ...(observation.keyExchangeBits ? { keySize: observation.keyExchangeBits } : {}),
      },
      title: `${algorithm} key exchange (${groupList})`,
      description: `Session keys at ${endpoint} are established with ${algorithm}. Groups accepted: ${groupList}. Traffic recorded today can be decrypted retrospectively once this exchange is breakable, so this is the first thing a hybrid key exchange has to replace.`,
      confidence: 0.99,
      detail: `${algorithm} ${groupList}`,
    });
  }

  if (suite.cipher) {
    add({
      ruleId: "TLS-BULK-CIPHER",
      algorithm: suite.cipher,
      parameters: {
        ...(suite.cipherKeySize ? { keySize: suite.cipherKeySize } : {}),
        ...(suite.mac ? { digest: suite.mac } : {}),
      },
      title: `${suite.cipher}${suite.cipherKeySize ? `-${suite.cipherKeySize}` : ""} bulk encryption`,
      description: `Record protection at ${endpoint} uses ${suite.cipher}${suite.cipherKeySize ? `-${suite.cipherKeySize}` : ""} from suite ${observation.cipherStandardName}.`,
      confidence: 0.99,
      detail: observation.cipherStandardName,
    });
  }

  observation.certificates.forEach((certificate, depth) => {
    const role = depth === 0 ? "leaf" : certificate.selfSigned ? "root" : "intermediate";
    if (certificate.signatureAlgorithm) {
      add({
        ruleId: "TLS-CERT-SIGNATURE",
        algorithm: certificate.signatureAlgorithm,
        parameters: {},
        title: `${role} certificate signed with ${certificate.signatureAlgorithm}`,
        description: `The ${role} certificate for ${endpoint} (${certificate.subject}) is signed with ${certificate.signatureAlgorithm} by ${certificate.issuer}, valid until ${certificate.validTo}. Replacing this signature is the issuing authority's decision, not the operator's.`,
        confidence: 0.99,
        detail: `${certificate.fingerprint256} ${certificate.signatureAlgorithm}`,
      });
    }
    if (certificate.publicKeyType) {
      const algorithm = certificate.publicKeyType === "ec" ? "ECDSA" : certificate.publicKeyType.toUpperCase();
      add({
        ruleId: "TLS-CERT-KEY",
        algorithm,
        parameters: {
          ...(certificate.publicKeyBits ? { keySize: certificate.publicKeyBits } : {}),
          ...(certificate.namedCurve ? { curve: certificate.namedCurve } : {}),
        },
        title: `${role} certificate key: ${algorithm}${certificate.publicKeyBits ? `-${certificate.publicKeyBits}` : ""}${certificate.namedCurve ? ` (${certificate.namedCurve})` : ""}`,
        description: `The ${role} certificate for ${endpoint} carries an ${algorithm} public key${certificate.publicKeyBits ? ` of ${certificate.publicKeyBits} bits` : ""}${certificate.namedCurve ? ` on curve ${certificate.namedCurve}` : ""}.`,
        confidence: 0.99,
        detail: `${certificate.fingerprint256} ${algorithm}`,
      });
    }
  });

  return candidates;
}

export const tlsProbeCollector: Collector = {
  id: "tls-probe",
  version: VERSION,

  supports(target: ScanTarget): boolean {
    return target.kind === "tls-endpoint";
  },

  async collect(target: ScanTarget, ctx: CollectorContext): Promise<CollectorOutput> {
    if (target.kind !== "tls-endpoint") return { candidates: [], unitsScanned: 0, notes: [] };
    try {
      const observation = await observeHandshake(target);
      const candidates = candidatesFromHandshake(target, observation, ctx);
      const notes = observation.authorized
        ? []
        : [`${target.host}:${target.port}: chain not trusted (${observation.authorizationError ?? "unknown"})`];
      ctx.log?.(`tls-probe: ${target.host}:${target.port} → ${observation.protocol}, ${candidates.length} candidates`);
      return { candidates, unitsScanned: 1, notes };
    } catch (error) {
      return {
        candidates: [],
        unitsScanned: 0,
        notes: [`${target.host}:${target.port}: ${(error as Error).message}`],
      };
    }
  },
};
