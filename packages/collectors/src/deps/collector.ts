/**
 * SENTINEL's dependency collector.
 *
 * Cryptography an application never writes is still cryptography it depends on.
 * This reads Maven and Gradle manifests, keeps the libraries that implement or
 * choose algorithms, and reports the version constraints that will decide what
 * the migration is actually able to do.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import {
  stableCandidateId,
  type AmbiguityReason,
  type Candidate,
  type ScanTarget,
} from "@ironbastion/core";
import type { Collector, CollectorContext, CollectorOutput } from "../shared/types.js";
import { sha256 } from "@ironbastion/core";
import { parseGradle, parsePom, type DeclaredDependency } from "./manifests.js";
import { blocksPqcMigration, matchLibrary, outdatedReason } from "./library-registry.js";

const VERSION = "1.0.0";

export const jvmDependencyCollector: Collector = {
  id: "jvm-deps",
  version: VERSION,

  supports(target: ScanTarget): boolean {
    return target.kind === "git-repository" && !!target.localPath;
  },

  async collect(target: ScanTarget, ctx: CollectorContext): Promise<CollectorOutput> {
    if (target.kind !== "git-repository" || !target.localPath) return { candidates: [], unitsScanned: 0, notes: [] };

    const root = target.localPath;
    const manifests = (
      await fg(["**/pom.xml", "**/build.gradle", "**/build.gradle.kts"], {
        cwd: root,
        ignore: ["**/node_modules/**", "**/.git/**", "**/target/**", "**/build/**"],
        suppressErrors: true,
      })
    ).sort();

    const candidates: Candidate[] = [];
    const notes: string[] = [];
    let scanned = 0;

    for (const relative of manifests) {
      let content: string;
      try {
        content = await readFile(path.join(root, relative), "utf8");
      } catch (error) {
        notes.push(`skipped ${relative}: ${(error as Error).message}`);
        continue;
      }
      scanned++;

      const declared = relative.endsWith("pom.xml") ? parsePom(content) : parseGradle(content);
      for (const dependency of declared) {
        const candidate = toCandidate({ dependency, relative, target, ctx });
        if (candidate) candidates.push(candidate);
      }
    }

    ctx.log?.(`jvm-deps: ${candidates.length} crypto-relevant dependencies in ${scanned} manifests`);
    return { candidates, unitsScanned: scanned, notes };
  },
};

function toCandidate(input: {
  dependency: DeclaredDependency;
  relative: string;
  target: Extract<ScanTarget, { kind: "git-repository" }>;
  ctx: CollectorContext;
}): Candidate | undefined {
  const { dependency, relative, target, ctx } = input;
  const entry = matchLibrary(dependency.groupId, dependency.artifactId);
  if (!entry) return undefined;

  const coordinate = `${dependency.groupId}:${dependency.artifactId}:${dependency.version}`;
  const outdated = outdatedReason(entry, dependency.version);
  const blocksPqc = blocksPqcMigration(entry, dependency.version);

  const ambiguity: AmbiguityReason[] = ["reachability-unknown"];
  if (dependency.scope === "test") ambiguity.push("test-scope");
  if (entry.defaultAlgorithm) ambiguity.push("wrapper-library");

  const detail = [
    entry.role,
    outdated ? outdated.reason : undefined,
    blocksPqc
      ? `Version ${dependency.version} predates ${entry.pqcCapableFrom}, so the standardised post-quantum algorithms are not reachable without upgrading this dependency first.`
      : undefined,
    entry.notes,
  ]
    .filter(Boolean)
    .join(" ");

  const component = `${target.name}/${moduleOf(relative)}`;

  return {
    id: stableCandidateId({
      component,
      ruleId: "JVM-DEP",
      locator: relative,
      line: dependency.line,
      algorithm: coordinate,
    }),
    scanId: ctx.scanId,
    algorithm: entry.defaultAlgorithm ?? "UNRESOLVED",
    primitive: entry.primitive,
    parameters: {},
    quantum: entry.defaultAlgorithm ? "broken" : "unknown",
    title: `${entry.name} ${dependency.version}${blocksPqc ? " — blocks PQC migration" : ""}`,
    description: `${coordinate} declared in ${relative}. ${detail}`,
    component,
    ambiguity,
    provenance: {
      source: "collector",
      collectorId: "jvm-deps",
      collectorVersion: VERSION,
      ruleId: blocksPqc ? "JVM-DEP-BLOCKS-PQC" : outdated ? "JVM-DEP-OUTDATED" : "JVM-DEP",
      confidence: 0.9,
      evidence: [
        {
          kind: "dependency",
          locator: `${relative}:${dependency.line}`,
          startLine: dependency.line,
          endLine: dependency.line,
          ...(ctx.metadataOnly ? {} : { snippet: coordinate }),
          snippetSha256: sha256(coordinate),
          observedAt: ctx.now(),
        },
      ],
    },
  };
}

function moduleOf(relative: string): string {
  const dir = path.dirname(relative);
  return dir === "." ? "." : dir;
}
