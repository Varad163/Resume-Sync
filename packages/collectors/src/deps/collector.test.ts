import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import type { GitRepositoryTarget } from "@ironbastion/core";
import { jvmDependencyCollector } from "./collector.js";
import { parseGradle, parsePom } from "./manifests.js";
import { compareVersions, matchLibrary } from "./library-registry.js";
import type { CollectorContext } from "../shared/types.js";

const target: GitRepositoryTarget = {
  kind: "git-repository",
  id: "repo_fixture",
  name: "acme-payments",
  localPath: fileURLToPath(new URL("../../../../fixtures/java-payments", import.meta.url)),
};

const ctx: CollectorContext = {
  scanId: "scan_deps",
  metadataOnly: false,
  now: () => "2026-08-22T00:00:00.000Z",
};

describe("parsePom", () => {
  it("resolves a version held in a property", () => {
    const xml = `<project><properties><bc.version>1.70</bc.version></properties>
      <dependencies><dependency><groupId>org.bouncycastle</groupId>
      <artifactId>bcprov-jdk15on</artifactId><version>\${bc.version}</version></dependency></dependencies></project>`;
    expect(parsePom(xml)[0]).toMatchObject({ artifactId: "bcprov-jdk15on", version: "1.70" });
  });

  it("keeps an unresolvable version verbatim rather than dropping the dependency", () => {
    const xml = `<project><dependencies><dependency><groupId>g</groupId>
      <artifactId>a</artifactId><version>\${missing}</version></dependency></dependencies></project>`;
    expect(parsePom(xml)[0]?.version).toBe("${missing}");
  });

  it("defaults the scope to compile and reads an explicit one", () => {
    const xml = `<project><dependencies>
      <dependency><groupId>g</groupId><artifactId>a</artifactId><version>1</version></dependency>
      <dependency><groupId>g</groupId><artifactId>b</artifactId><version>1</version><scope>test</scope></dependency>
      </dependencies></project>`;
    expect(parsePom(xml).map((d) => d.scope)).toEqual(["compile", "test"]);
  });

  it("returns nothing for malformed XML instead of throwing", () => {
    expect(parsePom("<project>")).toEqual([]);
  });
});

describe("parseGradle", () => {
  it("reads literal dependency declarations with their line numbers", () => {
    const script = [
      "dependencies {",
      "    implementation 'org.bouncycastle:bcprov-jdk18on:1.78'",
      '    testImplementation "junit:junit:4.13.2"',
      "}",
    ].join("\n");
    expect(parseGradle(script)).toEqual([
      { groupId: "org.bouncycastle", artifactId: "bcprov-jdk18on", version: "1.78", scope: "compile", line: 2 },
      { groupId: "junit", artifactId: "junit", version: "4.13.2", scope: "test", line: 3 },
    ]);
  });

  it("reports nothing for a computed declaration rather than guessing", () => {
    expect(parseGradle("implementation \"org.bouncycastle:bcprov:$bcVersion\"")).toEqual([
      { groupId: "org.bouncycastle", artifactId: "bcprov", version: "$bcVersion", scope: "compile", line: 1 },
    ]);
    expect(parseGradle("implementation libs.bouncycastle")).toEqual([]);
  });
});

describe("library registry", () => {
  it("matches wildcard coordinates", () => {
    expect(matchLibrary("org.bouncycastle", "bcprov-jdk15on")?.name).toBe("Bouncy Castle provider");
    expect(matchLibrary("com.example", "unrelated")).toBeUndefined();
  });

  it("compares versions numerically, not lexically", () => {
    expect(compareVersions("1.70", "1.78")).toBe(-1);
    expect(compareVersions("1.9", "1.10")).toBe(-1);
    expect(compareVersions("1.78", "1.78")).toBe(0);
  });
});

describe("jvmDependencyCollector", () => {
  it("keeps only crypto-relevant dependencies", async () => {
    const out = await jvmDependencyCollector.collect(target, ctx);
    const coordinates = out.candidates.map((c) => c.description);
    expect(coordinates.some((d) => d.includes("bcprov-jdk15on"))).toBe(true);
    expect(coordinates.some((d) => d.includes("junit"))).toBe(false);
  });

  it("flags a provider version that cannot reach the PQC algorithms", async () => {
    const out = await jvmDependencyCollector.collect(target, ctx);
    const blocked = out.candidates.find((c) => c.provenance.ruleId === "JVM-DEP-BLOCKS-PQC");
    expect(blocked?.title).toContain("blocks PQC migration");
    expect(blocked?.description).toContain("1.72");
  });

  it("does not flag the up-to-date provider in the gateway module", async () => {
    const out = await jvmDependencyCollector.collect(target, ctx);
    const gateway = out.candidates.filter((c) => c.component.endsWith("gateway"));
    expect(gateway.length).toBeGreaterThan(0);
    expect(gateway.every((c) => c.provenance.ruleId !== "JVM-DEP-BLOCKS-PQC")).toBe(true);
  });

  it("reads both Maven and Gradle manifests", async () => {
    const out = await jvmDependencyCollector.collect(target, ctx);
    expect(out.unitsScanned).toBe(2);
  });

  it("marks a JWT library as choosing the algorithm on the application's behalf", async () => {
    const out = await jvmDependencyCollector.collect(target, ctx);
    const jwt = out.candidates.find((c) => c.description.includes("jjwt"));
    expect(jwt?.ambiguity).toContain("wrapper-library");
    expect(jwt?.algorithm).toBe("RSASSA");
  });
});
