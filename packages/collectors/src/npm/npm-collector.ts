/**
 * SENTINEL's NPM dependency collector.
 *
 * Scans package.json files to discover cryptographically relevant dependencies,
 * mapping them into Candidates for post-quantum assessment.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import {
  stableCandidateId,
  type AmbiguityReason,
  type Candidate,
  type ScanTarget,
  sha256,
} from "@ironbastion/core";
import type { Collector, CollectorContext, CollectorOutput } from "../shared/types.js";
import { matchNpmLibrary, blocksPqcMigration, outdatedReason } from "../deps/library-registry.js";

const VERSION = "1.0.0";

export const npmDependencyCollector: Collector = {
  id: "npm-deps",
  version: VERSION,

  supports(target: ScanTarget): boolean {
    return target.kind === "git-repository" && !!target.localPath;
  },

  async collect(target: ScanTarget, ctx: CollectorContext): Promise<CollectorOutput> {
    if (target.kind !== "git-repository" || !target.localPath) {
      return { candidates: [], unitsScanned: 0, notes: [] };
    }

    const root = target.localPath;
    const manifests = (
      await fg(["**/package.json"], {
        cwd: root,
        ignore: ["**/node_modules/**", "**/.git/**", "**/target/**", "**/build/**", "**/dist/**"],
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

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(content) as Record<string, unknown>;
      } catch (error) {
        notes.push(`failed to parse ${relative}: ${(error as Error).message}`);
        continue;
      }

      const dependencies = (parsed.dependencies ?? {}) as Record<string, unknown>;
      for (const [name, version] of Object.entries(dependencies)) {
        if (typeof version !== "string") continue;
        const candidate = toCandidate({
          name,
          version,
          scope: "compile",
          relative,
          content,
          target,
          ctx,
        });
        if (candidate) candidates.push(candidate);
      }

      const devDependencies = (parsed.devDependencies ?? {}) as Record<string, unknown>;
      for (const [name, version] of Object.entries(devDependencies)) {
        if (typeof version !== "string") continue;
        const candidate = toCandidate({
          name,
          version,
          scope: "dev",
          relative,
          content,
          target,
          ctx,
        });
        if (candidate) candidates.push(candidate);
      }
    }

    ctx.log?.(`npm-deps: ${candidates.length} crypto-relevant dependencies in ${scanned} manifests`);
    return { candidates, unitsScanned: scanned, notes };
  },
};

function toCandidate(input: {
  name: string;
  version: string;
  scope: string;
  relative: string;
  content: string;
  target: Extract<ScanTarget, { kind: "git-repository" }>;
  ctx: CollectorContext;
}): Candidate | undefined {
  const { name, version, scope, relative, content, target, ctx } = input;
  const entry = matchNpmLibrary(name);
  if (!entry) return undefined;

  const coordinate = `${name}:${version}`;
  const blocksPqc = entry.pqcCapableFrom ? blocksPqcMigration(entry, version) : false;
  const outdated = outdatedReason(entry, version);

  const ambiguity: AmbiguityReason[] = ["reachability-unknown"];
  if (scope === "dev") ambiguity.push("test-scope");
  if (entry.defaultAlgorithm) ambiguity.push("wrapper-library");

  const line = lineOfDependency(content, name);
  const component = `${target.name}/${moduleOf(relative)}`;

  const ruleId = blocksPqc ? "NPM-DEP-BLOCKS-PQC" : outdated ? "NPM-DEP-OUTDATED" : "NPM-DEP";
  const detail = [
    entry.role,
    outdated ? outdated.reason : undefined,
    blocksPqc
      ? `Version ${version} predates ${entry.pqcCapableFrom}, so the standardised post-quantum algorithms are not reachable without upgrading this dependency first.`
      : undefined,
    entry.notes,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    id: stableCandidateId({
      component,
      ruleId,
      locator: relative,
      line,
      algorithm: coordinate,
    }),
    scanId: ctx.scanId,
    algorithm: entry.defaultAlgorithm ?? "LIBRARY",
    primitive: entry.primitive,
    parameters: {},
    quantum: entry.defaultAlgorithm ? "broken" : "unknown",
    title: `${entry.name} ${version}${blocksPqc ? " — blocks PQC migration" : ""}`,
    description: `${coordinate} declared in ${relative}. ${detail}`.trim(),
    component,
    ambiguity,
    provenance: {
      source: "collector",
      collectorId: "npm-deps",
      collectorVersion: VERSION,
      ruleId,
      confidence: 0.9,
      evidence: [
        {
          kind: "dependency",
          locator: `${relative}:${line}`,
          startLine: line,
          endLine: line,
          ...(ctx.metadataOnly ? {} : { snippet: coordinate }),
          snippetSha256: sha256(coordinate),
          observedAt: ctx.now(),
        },
      ],
    },
  };
}

function lineOfDependency(jsonString: string, packageName: string): number {
  const index = jsonString.indexOf(`"${packageName}"`);
  if (index === -1) return 1;
  return jsonString.slice(0, index).split("\n").length;
}

function moduleOf(relative: string): string {
  const dir = path.dirname(relative);
  return dir === "." ? "." : dir;
}
