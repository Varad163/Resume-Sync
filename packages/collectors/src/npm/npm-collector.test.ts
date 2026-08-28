import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import type { GitRepositoryTarget } from "@ironbastion/core";
import { npmDependencyCollector } from "./npm-collector.js";
import { matchNpmLibrary } from "../deps/library-registry.js";
import type { CollectorContext } from "../shared/types.js";

const tmpDir = path.resolve("./packages/collectors/src/npm/tmp_test_fixture");

const target: GitRepositoryTarget = {
  kind: "git-repository",
  id: "repo_npm_fixture",
  name: "acme-node-payments",
  localPath: tmpDir,
};

const ctx: CollectorContext = {
  scanId: "scan_npm_deps",
  metadataOnly: false,
  now: () => "2026-08-22T00:00:00.000Z",
};

describe("library registry npm matching", () => {
  it("matches NPM cryptographic packages", () => {
    expect(matchNpmLibrary("crypto-js")?.name).toBe("crypto-js");
    expect(matchNpmLibrary("jose")?.name).toBe("jose");
    expect(matchNpmLibrary("unrelated-pkg")).toBeUndefined();
  });
});

describe("npmDependencyCollector", () => {
  beforeAll(async () => {
    await mkdir(tmpDir, { recursive: true });
    const packageJson = {
      name: "acme-node-payments",
      version: "1.0.0",
      dependencies: {
        "crypto-js": "^4.2.0",
        "unrelated-pkg": "^1.0.0",
      },
      devDependencies: {
        "jose": "^5.2.0",
      },
    };
    await writeFile(
      path.join(tmpDir, "package.json"),
      JSON.stringify(packageJson, null, 2),
      "utf8"
    );
  });

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("scans package.json and finds crypto-relevant dependencies", async () => {
    const out = await npmDependencyCollector.collect(target, ctx);
    expect(out.unitsScanned).toBe(1);

    const candidates = out.candidates;
    expect(candidates).toHaveLength(2);

    const cryptoJs = candidates.find((c) => c.title.includes("crypto-js"));
    expect(cryptoJs).toBeDefined();
    expect(cryptoJs?.algorithm).toBe("LIBRARY");
    expect(cryptoJs?.primitive).toBe("unknown");
    expect(cryptoJs?.quantum).toBe("unknown");
    expect(cryptoJs?.ambiguity).not.toContain("test-scope");

    const jose = candidates.find((c) => c.title.includes("jose"));
    expect(jose).toBeDefined();
    expect(jose?.algorithm).toBe("LIBRARY");
    expect(jose?.primitive).toBe("unknown");
    expect(jose?.quantum).toBe("unknown");
    expect(jose?.ambiguity).toContain("test-scope");
  });

  it("determines correct line numbers of dependencies in package.json", async () => {
    const out = await npmDependencyCollector.collect(target, ctx);
    const cryptoJs = out.candidates.find((c) => c.title.includes("crypto-js"));
    const jose = out.candidates.find((c) => c.title.includes("jose"));

    expect(cryptoJs).toBeDefined();
    expect(jose).toBeDefined();
    // In a prettified JSON with 2-spaces indent, the line numbers are predictable
    expect(cryptoJs!.provenance.evidence![0]!.startLine).toBe(5);
    expect(jose!.provenance.evidence![0]!.startLine).toBe(9);
  });
});
