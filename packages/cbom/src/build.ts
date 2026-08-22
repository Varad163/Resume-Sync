/**
 * ATLAS: assembling the Cryptographic Bill of Materials.
 *
 * Findings are per-occurrence; a CBOM is per-asset. The same RSA-2048 key
 * transport used in nine services is one cryptographic asset with nine
 * occurrences, and collapsing it that way is the whole point — it is what turns
 * a list of alerts into an inventory somebody can act on.
 *
 * Deduplication is by algorithm plus the parameters that change its security
 * position. RSA-2048 and RSA-4096 are different assets. AES-GCM and AES-CBC are
 * different assets. AES-GCM found twice in one file is one asset, twice.
 */

import { algorithmById, type Finding, type ScanRecord } from "@ironbastion/core";
import type {
  CycloneDxBom,
  CycloneDxComponent,
  CryptoProperties,
  Occurrence,
} from "./cyclonedx.js";
import {
  bomRefFor,
  cryptoFunctionsFor,
  nistSecurityLevel,
  toCycloneDxPrimitive,
  toMode,
  toPadding,
} from "./mapping.js";

export interface CbomOptions {
  readonly serialNumber?: string;
  readonly timestamp?: string;
  readonly projectName: string;
  readonly projectVersion?: string;
  readonly toolVersion?: string;
}

export function buildCbom(
  scan: ScanRecord,
  findings: readonly Finding[],
  options: CbomOptions,
): CycloneDxBom {
  const grouped = new Map<string, Finding[]>();
  for (const finding of findings) {
    const ref = bomRefFor(finding.algorithm, finding.parameters);
    const bucket = grouped.get(ref);
    if (bucket) bucket.push(finding);
    else grouped.set(ref, [finding]);
  }

  const components = [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ref, group]) => toComponent(ref, group));

  return {
    bomFormat: "CycloneDX",
    specVersion: "1.6",
    serialNumber: options.serialNumber ?? `urn:uuid:${scan.id.replace(/^scan_/, "")}`,
    version: 1,
    metadata: {
      timestamp: options.timestamp ?? scan.finishedAt ?? scan.startedAt,
      tools: {
        components: [
          {
            type: "application",
            name: "IronBastion",
            version: options.toolVersion ?? "0.1.0",
            publisher: "IronBastion",
          },
        ],
      },
      component: {
        type: "application",
        "bom-ref": `project/${scan.projectId}`,
        name: options.projectName,
        ...(options.projectVersion ? { version: options.projectVersion } : {}),
      },
      properties: [
        { name: "ironbastion:scan-id", value: scan.id },
        { name: "ironbastion:findings", value: String(findings.length) },
        {
          name: "ironbastion:quantum-vulnerable-assets",
          value: String(
            components.filter(
              (c) => c.cryptoProperties.algorithmProperties?.nistQuantumSecurityLevel === 0,
            ).length,
          ),
        },
      ],
    },
    components,
  };
}

function toComponent(ref: string, group: Finding[]): CycloneDxComponent {
  const head = group[0]!;
  const entry = algorithmById(head.algorithm);
  const parameterSet = head.parameters.keySize
    ? String(head.parameters.keySize)
    : head.parameters.curve;

  const cryptoProperties: CryptoProperties = {
    assetType: assetTypeFor(head),
    ...(entry?.reference?.startsWith("1.") ? {} : {}),
    algorithmProperties: {
      primitive: toCycloneDxPrimitive(head.primitive),
      ...(parameterSet ? { parameterSetIdentifier: parameterSet } : {}),
      ...(head.parameters.curve ? { curve: head.parameters.curve } : {}),
      executionEnvironment: "software-plain-ram",
      implementationPlatform: "generic",
      certificationLevel: ["none"],
      ...(toMode(head.parameters.mode) ? { mode: toMode(head.parameters.mode) } : {}),
      ...(toPadding(head.parameters.padding) ? { padding: toPadding(head.parameters.padding) } : {}),
      cryptoFunctions: cryptoFunctionsFor(head.primitive),
      nistQuantumSecurityLevel: nistSecurityLevel(head.algorithm, head.quantum, head.parameters),
    },
  };

  if (head.primitive === "protocol") {
    cryptoProperties.assetType = "protocol";
    cryptoProperties.protocolProperties = {
      type: "tls",
      ...(head.parameters.protocolVersion ? { version: head.parameters.protocolVersion } : {}),
    };
  }

  const occurrences: Occurrence[] = group.flatMap((finding) =>
    finding.provenance.evidence.map((evidence) => ({
      location: evidence.locator,
      ...(evidence.startLine ? { line: evidence.startLine } : {}),
      additionalContext: finding.title,
    })),
  );

  const severities = group.map((f) => f.risk.severity);
  const worstScore = Math.max(...group.map((f) => f.risk.score));

  return {
    type: "cryptographic-asset",
    "bom-ref": ref,
    name: displayName(head.algorithm, head.parameters.keySize, head.parameters.curve),
    description: entry
      ? `${entry.name}${entry.reference ? ` (${entry.reference})` : ""}`
      : `Unrecognised algorithm reported as ${head.algorithm}`,
    cryptoProperties,
    evidence: { occurrences },
    properties: [
      { name: "ironbastion:quantum", value: head.quantum },
      { name: "ironbastion:risk-score", value: String(worstScore) },
      { name: "ironbastion:severity", value: worstSeverity(severities) },
      { name: "ironbastion:occurrences", value: String(occurrences.length) },
      {
        name: "ironbastion:components",
        value: [...new Set(group.map((f) => f.component))].sort().join(", "),
      },
      ...(head.recommendedAlgorithm
        ? [{ name: "ironbastion:recommended-replacement", value: head.recommendedAlgorithm }]
        : []),
    ],
  };
}

function assetTypeFor(finding: Finding): CryptoProperties["assetType"] {
  if (finding.primitive === "certificate") return "certificate";
  if (finding.primitive === "protocol") return "protocol";
  if (finding.primitive === "key-store") return "related-crypto-material";
  return "algorithm";
}

function displayName(algorithm: string, keySize?: number, curve?: string): string {
  const entry = algorithmById(algorithm);
  const base = entry?.name ?? algorithm;
  if (curve) return `${base} (${curve})`;
  if (keySize) return `${base}-${keySize}`;
  return base;
}

const ORDER = ["critical", "high", "medium", "low", "informational"] as const;

function worstSeverity(severities: readonly string[]): string {
  for (const level of ORDER) if (severities.includes(level)) return level;
  return "informational";
}
