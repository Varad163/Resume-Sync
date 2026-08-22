/**
 * SENTINEL's JVM source collector.
 *
 * Walks a checked-out repository, applies the JVM crypto rules, and emits
 * candidates carrying the file, the line, and a hashed excerpt. It never
 * reaches the network and never mutates the tree.
 */

import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import {
  assessQuantumVulnerability,
  stableCandidateId,
  type Candidate,
  type AmbiguityReason,
  type ScanTarget,
} from "@ironbastion/core";
import type { Collector, CollectorContext, CollectorOutput } from "../shared/types.js";
import { excerpt } from "../shared/text.js";
import { detectJvmCrypto, type JvmDetection } from "./rules.js";

const VERSION = "1.0.0";

/** Files above this size are almost always generated or vendored. */
const MAX_FILE_BYTES = 2_000_000;

const IGNORED = [
  "**/node_modules/**",
  "**/.git/**",
  "**/target/**",
  "**/build/**",
  "**/out/**",
  "**/bin/**",
  "**/generated/**",
  "**/*.generated.java",
];

export const jvmSourceCollector: Collector = {
  id: "jvm-source",
  version: VERSION,

  supports(target: ScanTarget): boolean {
    return target.kind === "git-repository" && !!target.localPath;
  },

  async collect(target: ScanTarget, ctx: CollectorContext): Promise<CollectorOutput> {
    if (target.kind !== "git-repository" || !target.localPath) {
      return { candidates: [], unitsScanned: 0, notes: ["target is not a checked-out repository"] };
    }

    const root = target.localPath;
    // Sorted, because a scan has to be reproducible: the same tree must yield
    // the same findings in the same order, run after run.
    const files = (
      await fg(["**/*.java", "**/*.kt"], {
        cwd: root,
        ignore: IGNORED,
        absolute: false,
        dot: false,
        followSymbolicLinks: false,
        suppressErrors: true,
      })
    ).sort();

    const candidates: Candidate[] = [];
    const notes: string[] = [];
    let scanned = 0;

    for (const relative of files) {
      const absolute = path.join(root, relative);
      let source: string;
      try {
        const info = await stat(absolute);
        if (info.size > MAX_FILE_BYTES) {
          notes.push(`skipped ${relative}: ${info.size} bytes exceeds the per-file limit`);
          continue;
        }
        source = await readFile(absolute, "utf8");
      } catch (error) {
        notes.push(`skipped ${relative}: ${(error as Error).message}`);
        continue;
      }

      scanned++;
      for (const detection of detectJvmCrypto(source)) {
        candidates.push(toCandidate({ detection, relative, source, target, ctx }));
      }
    }

    ctx.log?.(`jvm-source: ${candidates.length} candidates across ${scanned} files`);
    return { candidates, unitsScanned: scanned, notes };
  },
};

function toCandidate(input: {
  detection: JvmDetection;
  relative: string;
  source: string;
  target: Extract<ScanTarget, { kind: "git-repository" }>;
  ctx: CollectorContext;
}): Candidate {
  const { detection, relative, source, target, ctx } = input;
  const region = excerpt(source, detection.line);
  const testScope = isTestPath(relative);
  const ambiguity: AmbiguityReason[] = [...detection.ambiguity];
  if (testScope && !ambiguity.includes("test-scope")) ambiguity.push("test-scope");
  if (ambiguity.length === 0) ambiguity.push("reachability-unknown");

  const quantum = assessQuantumVulnerability(detection.algorithm, {
    ...(detection.parameters.keySize !== undefined ? { keySize: detection.parameters.keySize } : {}),
    ...(detection.parameters.curve ? { curve: detection.parameters.curve } : {}),
  });

  const component = `${target.name}/${moduleOf(relative)}`;

  return {
    id: stableCandidateId({
      component,
      ruleId: detection.ruleId,
      locator: relative,
      line: detection.line,
      algorithm: detection.algorithm,
    }),
    scanId: ctx.scanId,
    algorithm: detection.algorithm,
    primitive: detection.primitive,
    parameters: detection.parameters,
    quantum,
    title: titleFor(detection),
    description: descriptionFor(detection, relative),
    component,
    ambiguity,
    provenance: {
      source: "collector",
      collectorId: "jvm-source",
      collectorVersion: VERSION,
      ruleId: detection.ruleId,
      confidence: detection.confidence,
      evidence: [
        {
          kind: "source-span",
          locator: relative,
          startLine: region.startLine,
          endLine: region.endLine,
          ...(ctx.metadataOnly ? {} : { snippet: region.snippet }),
          snippetSha256: region.snippetSha256,
          observedAt: ctx.now(),
        },
      ],
    },
  };
}

function titleFor(detection: JvmDetection): string {
  if (detection.algorithm === "UNRESOLVED") {
    return `Runtime-selected algorithm in ${detection.note.toLowerCase()}`;
  }
  const size = detection.parameters.keySize ? `-${detection.parameters.keySize}` : "";
  const curve = detection.parameters.curve ? ` (${detection.parameters.curve})` : "";
  return `${detection.algorithm}${size}${curve} — ${detection.note.toLowerCase()}`;
}

function descriptionFor(detection: JvmDetection, relative: string): string {
  const where = `${relative}:${detection.line}`;
  if (detection.algorithm === "UNRESOLVED") {
    return `${detection.note} at ${where}, with the algorithm supplied at runtime as \`${detection.algorithmRaw}\`. The concrete algorithm cannot be determined from source alone.`;
  }
  const params = [
    detection.parameters.keySize ? `${detection.parameters.keySize}-bit` : undefined,
    detection.parameters.curve,
    detection.parameters.mode,
    detection.parameters.padding,
    detection.parameters.provider ? `provider ${detection.parameters.provider}` : undefined,
  ]
    .filter(Boolean)
    .join(", ");
  return `${detection.note} at ${where} using ${detection.algorithmRaw}${params ? ` (${params})` : ""}.`;
}

function isTestPath(relative: string): boolean {
  return /(^|\/)(src\/test|test|tests|src\/androidTest)\//.test(relative);
}

/** The Maven/Gradle module a file belongs to, used to group findings. */
function moduleOf(relative: string): string {
  const marker = relative.indexOf("src/");
  if (marker > 0) return relative.slice(0, marker - 1);
  if (marker === 0) return ".";
  return path.dirname(relative);
}
