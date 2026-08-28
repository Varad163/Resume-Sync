/**
 * SENTINEL's Python source collector.
 *
 * Walks a checked-out repository, scans Python (.py) source files using Python
 * cryptography rules, and emits candidates carrying file and line details.
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
import { scanPythonSource, type PythonDetection } from "./rules.js";

const VERSION = "1.0.0";

const MAX_FILE_BYTES = 2_000_000;

const IGNORED = [
  "**/node_modules/**",
  "**/.git/**",
  "**/target/**",
  "**/build/**",
  "**/dist/**",
  "**/.venv/**",
  "**/venv/**",
  "**/virtualenv/**",
  "**/site-packages/**",
];

export const pythonSourceCollector: Collector = {
  id: "python-source",
  version: VERSION,

  supports(target: ScanTarget): boolean {
    return target.kind === "git-repository" && !!target.localPath;
  },

  async collect(target: ScanTarget, ctx: CollectorContext): Promise<CollectorOutput> {
    if (target.kind !== "git-repository" || !target.localPath) {
      return { candidates: [], unitsScanned: 0, notes: ["target is not a checked-out repository"] };
    }

    const root = target.localPath;
    const files = (
      await fg(["**/*.py"], {
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
      for (const detection of scanPythonSource(source)) {
        candidates.push(toCandidate({ detection, relative, source, target, ctx }));
      }
    }

    ctx.log?.(`python-source: ${candidates.length} candidates across ${scanned} files`);
    return { candidates, unitsScanned: scanned, notes };
  },
};

function toCandidate(input: {
  detection: PythonDetection;
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

  const quantum = assessQuantumVulnerability(detection.algorithm, {});

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
    parameters: {},
    quantum,
    title: `${detection.algorithm} — ${detection.note.toLowerCase()}`,
    description: `${detection.note} detected in ${relative}:${detection.line}: \`${detection.snippet}\``,
    component,
    ambiguity,
    provenance: {
      source: "collector",
      collectorId: "python-source",
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

function isTestPath(relative: string): boolean {
  return /(^|\/)(src\/test|test|tests|src\/androidTest)\//.test(relative);
}

function moduleOf(relative: string): string {
  const dir = path.dirname(relative);
  return dir === "." ? "." : dir;
}
