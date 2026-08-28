/**
 * SENTINEL's PyPI dependency collector.
 *
 * Scans requirements.txt and pyproject.toml files to discover cryptographically
 * relevant Python dependencies, mapping them to Candidates.
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
import { matchPypiLibrary, blocksPqcMigration, outdatedReason } from "../deps/library-registry.js";

const VERSION = "1.0.0";

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

export const pypiDependencyCollector: Collector = {
  id: "pypi-deps",
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
      await fg(["**/requirements.txt", "**/pyproject.toml"], {
        cwd: root,
        ignore: IGNORED,
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

      const isRequirements = relative.endsWith("requirements.txt");
      const declared = isRequirements ? parseRequirements(content) : parsePyProject(content);

      for (const dep of declared) {
        const candidate = toCandidate({
          name: dep.name,
          version: dep.version,
          scope: dep.scope,
          line: dep.line,
          relative,
          coordinate: `${dep.name}:${dep.version}`,
          target,
          ctx,
        });
        if (candidate) {
          candidates.push(candidate);
        }
      }
    }

    ctx.log?.(`pypi-deps: ${candidates.length} crypto-relevant dependencies in ${scanned} manifests`);
    return { candidates, unitsScanned: scanned, notes };
  },
};

interface ParsedDep {
  name: string;
  version: string;
  scope: string;
  line: number;
}

export function parseRequirements(content: string): ParsedDep[] {
  const results: ParsedDep[] = [];
  const lines = content.split("\n");
  const pattern = /^\s*([a-zA-Z0-9_-]+)(?:\[[a-zA-Z0-9_,-]+\])?\s*(?:(?:==|>=|<=|~=|!=|>|<)\s*([a-zA-Z0-9_.-]+))?/;

  lines.forEach((text, index) => {
    const trimmed = text.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("-r") || trimmed.startsWith("-e")) return;
    const match = pattern.exec(trimmed);
    if (!match) return;
    const [, name = "", version = "unspecified"] = match;
    results.push({
      name: name.toLowerCase(),
      version: version || "unspecified",
      scope: "compile",
      line: index + 1,
    });
  });
  return results;
}

export function parsePyProject(content: string): ParsedDep[] {
  const results: ParsedDep[] = [];
  const lines = content.split("\n");

  let inDependenciesList = false;
  const arrayItemPattern = /^\s*['"]([a-zA-Z0-9_-]+)(?:\[[a-zA-Z0-9_,-]+\])?\s*(?:([<>=~!]+)\s*([a-zA-Z0-9_.-]+))?['"]/;
  const tableItemPattern = /^\s*([a-zA-Z0-9_-]+)\s*=\s*(?:['"]([^'"]+)['"]|\{\s*version\s*=\s*['"]([^'"]+)['"])/;

  let inSection = "";

  lines.forEach((text, index) => {
    const trimmed = text.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      inSection = trimmed;
      inDependenciesList = false;
      return;
    }

    if (inSection === "[project]" && trimmed.startsWith("dependencies = [")) {
      inDependenciesList = true;
      return;
    }

    if (inDependenciesList) {
      if (trimmed.startsWith("]")) {
        inDependenciesList = false;
        return;
      }
      const match = arrayItemPattern.exec(trimmed);
      if (match) {
        const [, name = "", , version = "unspecified"] = match;
        results.push({
          name: name.toLowerCase(),
          version: version || "unspecified",
          scope: "compile",
          line: index + 1,
        });
      }
      return;
    }

    if (
      inSection === "[tool.poetry.dependencies]" ||
      inSection.startsWith("[tool.poetry.group.dev.dependencies]") ||
      inSection.startsWith("[project.optional-dependencies]")
    ) {
      const match = tableItemPattern.exec(trimmed);
      if (match) {
        const [, name = "", version1 = "", version2 = ""] = match;
        const scope = inSection.includes("dev") || inSection.includes("optional") ? "dev" : "compile";
        results.push({
          name: name.toLowerCase(),
          version: version1 || version2 || "unspecified",
          scope,
          line: index + 1,
        });
      }
    }
  });

  return results;
}

function toCandidate(input: {
  name: string;
  version: string;
  scope: string;
  line: number;
  relative: string;
  coordinate: string;
  target: Extract<ScanTarget, { kind: "git-repository" }>;
  ctx: CollectorContext;
}): Candidate | undefined {
  const { name, version, scope, line, relative, coordinate, target, ctx } = input;
  const entry = matchPypiLibrary(name);
  if (!entry) return undefined;

  const blocksPqc = entry.pqcCapableFrom ? blocksPqcMigration(entry, version) : false;
  const outdated = outdatedReason(entry, version);

  const ambiguity: AmbiguityReason[] = ["reachability-unknown"];
  if (scope === "dev") ambiguity.push("test-scope");
  if (entry.defaultAlgorithm) ambiguity.push("wrapper-library");

  const component = `${target.name}/${moduleOf(relative)}`;
  const ruleId = blocksPqc ? "PYPI-DEP-BLOCKS-PQC" : outdated ? "PYPI-DEP-OUTDATED" : "PYPI-DEP";
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
      collectorId: "pypi-deps",
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

function moduleOf(relative: string): string {
  const dir = path.dirname(relative);
  return dir === "." ? "." : dir;
}
