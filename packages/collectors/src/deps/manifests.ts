/** Dependency extraction from Maven POMs and Gradle build scripts. */

import { XMLParser } from "fast-xml-parser";

export interface DeclaredDependency {
  readonly groupId: string;
  readonly artifactId: string;
  readonly version: string;
  readonly scope: string;
  /** 1-based line in the manifest, for evidence. */
  readonly line: number;
}

/**
 * Parses a POM, resolving `${property}` versions against the file's own
 * `<properties>` block. Unresolved versions are kept verbatim rather than
 * dropped — an unknown version is itself a finding.
 */
export function parsePom(xml: string): DeclaredDependency[] {
  const parser = new XMLParser({ ignoreAttributes: true, parseTagValue: false });
  let document: Record<string, unknown>;
  try {
    document = parser.parse(xml) as Record<string, unknown>;
  } catch {
    return [];
  }

  const project = (document["project"] ?? {}) as Record<string, unknown>;
  const properties = (project["properties"] ?? {}) as Record<string, string>;
  const container = (project["dependencies"] ?? {}) as Record<string, unknown>;
  const raw = container["dependency"];
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];

  return list
    .map((entry) => entry as Record<string, string>)
    .filter((entry) => entry["groupId"] && entry["artifactId"])
    .map((entry) => {
      const version = resolveProperty(entry["version"] ?? "unspecified", properties);
      return {
        groupId: String(entry["groupId"]),
        artifactId: String(entry["artifactId"]),
        version,
        scope: String(entry["scope"] ?? "compile"),
        line: lineOfArtifact(xml, String(entry["artifactId"])),
      };
    });
}

function resolveProperty(value: string, properties: Record<string, string>): string {
  const match = /^\$\{(.+)\}$/.exec(value.trim());
  if (!match) return value.trim();
  const key = match[1]!;
  const resolved = properties[key];
  return resolved ? String(resolved).trim() : value.trim();
}

/**
 * Gradle scripts are programs, not data. Rather than pretend to evaluate one,
 * this reads the declarations that are written literally — which is how the
 * overwhelming majority of dependencies are declared — and reports nothing for
 * the rest, instead of guessing.
 */
export function parseGradle(script: string): DeclaredDependency[] {
  const results: DeclaredDependency[] = [];
  const lines = script.split("\n");
  const pattern =
    /^\s*(implementation|api|compileOnly|runtimeOnly|testImplementation|testCompileOnly|compile|testCompile)\s*[( ]\s*['"]([^'":]+):([^'":]+):([^'"]+)['"]/;

  lines.forEach((text, index) => {
    const match = pattern.exec(text);
    if (!match) return;
    const [, configuration = "", groupId = "", artifactId = "", version = ""] = match;
    results.push({
      groupId,
      artifactId,
      version,
      scope: configuration.startsWith("test") ? "test" : "compile",
      line: index + 1,
    });
  });

  return results;
}

function lineOfArtifact(xml: string, artifactId: string): number {
  const index = xml.indexOf(`<artifactId>${artifactId}</artifactId>`);
  if (index === -1) return 1;
  return xml.slice(0, index).split("\n").length;
}
