import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import type { GitRepositoryTarget } from "@ironbastion/core";
import { jsSourceCollector } from "./source-collector.js";
import { scanJsSource } from "./rules.js";
import { ALL_COLLECTORS } from "../index.js";
import type { CollectorContext } from "../shared/types.js";

const tmpDir = path.resolve("./packages/collectors/src/js/tmp_js_test_fixture");

const target: GitRepositoryTarget = {
  kind: "git-repository",
  id: "repo_js_fixture",
  name: "acme-js-source",
  localPath: tmpDir,
};

const ctx: CollectorContext = {
  scanId: "scan_js_source",
  metadataOnly: false,
  now: () => "2026-08-22T00:00:00.000Z",
};

describe("ALL_COLLECTORS registration", () => {
  it("registers jsSourceCollector in ALL_COLLECTORS", () => {
    expect(ALL_COLLECTORS.map((c) => c.id)).toContain("js-source");
  });
});

describe("js source scan rules", () => {
  it("detects Node.js createCipheriv and createDecipheriv", () => {
    const code = [
      "const c = crypto.createCipheriv('aes-256-gcm', key, iv);",
      "const d = crypto.createDecipheriv('aes-128-cbc', key, iv);",
      "const unresolved = crypto.createCipheriv(someVar, key, iv);",
    ].join("\n");
    
    const det = scanJsSource(code);
    expect(det).toHaveLength(3);

    expect(det[0]!.ruleId).toBe("JS-CIPHER");
    expect(det[0]!.algorithm).toBe("AES-256-GCM");

    expect(det[1]!.ruleId).toBe("JS-DECIPHER");
    expect(det[1]!.algorithm).toBe("AES-128-CBC");

    expect(det[2]!.ruleId).toBe("JS-CIPHER");
    expect(det[2]!.algorithm).toBe("unknown");
    expect(det[2]!.confidence).toBeLessThan(0.5);
  });

  it("detects Node.js createHash and createHmac", () => {
    const code = [
      "const h = crypto.createHash('sha256');",
      "const hm = crypto.createHmac('sha512', key);",
    ].join("\n");

    const det = scanJsSource(code);
    expect(det).toHaveLength(2);

    expect(det[0]!.ruleId).toBe("JS-HASH");
    expect(det[0]!.algorithm).toBe("SHA256");

    expect(det[1]!.ruleId).toBe("JS-HMAC");
    expect(det[1]!.algorithm).toBe("SHA512");
  });

  it("detects Web Crypto subtle operations", () => {
    const code = [
      "await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);",
      "await crypto.subtle.digest('SHA-256', data);",
      "await window.crypto.subtle.decrypt({name: \"AES-CBC\"}, key, data);",
    ].join("\n");

    const det = scanJsSource(code);
    expect(det).toHaveLength(3);

    expect(det[0]!.ruleId).toBe("JS-WEB-ENCRYPT");
    expect(det[0]!.algorithm).toBe("AES-GCM");

    expect(det[1]!.ruleId).toBe("JS-WEB-DIGEST");
    expect(det[1]!.algorithm).toBe("SHA-256");

    expect(det[2]!.ruleId).toBe("JS-WEB-DECRYPT");
    expect(det[2]!.algorithm).toBe("AES-CBC");
  });

  it("ignores imports alone, comments, and unrelated strings", () => {
    const code = [
      "import crypto from 'crypto';",
      "// const c = crypto.createCipheriv('aes-256-gcm', key, iv);",
      "/* crypto.createHash('md5') */",
      "const someString = 'subtle.encrypt';",
    ].join("\n");

    const det = scanJsSource(code);
    expect(det).toHaveLength(0);
  });
});

describe("jsSourceCollector file scanning", () => {
  beforeAll(async () => {
    await mkdir(tmpDir, { recursive: true });

    // 1. Create main JS file
    const mainContent = [
      "const crypto = require('crypto');", // line 1
      "function encrypt(data) {", // line 2
      "    return crypto.createCipheriv('aes-256-cbc', key, iv);", // line 3
      "}", // line 4
    ].join("\n");
    await writeFile(path.join(tmpDir, "index.js"), mainContent, "utf8");

    // 2. Create a test file
    const testDir = path.join(tmpDir, "tests");
    await mkdir(testDir, { recursive: true });
    const testContent = [
      "describe('test', () => {",
      "    const h = crypto.createHash('sha256');",
      "});",
    ].join("\n");
    await writeFile(path.join(testDir, "app.test.ts"), testContent, "utf8");

    // 3. Create a fake node_modules directory to ignore
    const nodeModulesDir = path.join(tmpDir, "node_modules");
    await mkdir(nodeModulesDir, { recursive: true });
    await writeFile(path.join(nodeModulesDir, "dep.js"), "crypto.createHash('md5')", "utf8");
  });

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("scans JS/TS source files, ignores node_modules, and flags test-scope", async () => {
    const out = await jsSourceCollector.collect(target, ctx);
    // Should scan index.js and tests/app.test.ts, but ignore node_modules/dep.js
    expect(out.unitsScanned).toBe(2);

    const candidates = out.candidates;
    expect(candidates).toHaveLength(2);

    // Verify index.js findings
    const mainCands = candidates.filter((c) => {
      const ev = c.provenance.evidence?.[0];
      return ev?.locator === "index.js";
    });
    expect(mainCands).toHaveLength(1);
    expect(mainCands[0]!.provenance.ruleId).toBe("JS-CIPHER");
    expect(mainCands[0]!.algorithm).toBe("AES-256-CBC");
    expect(mainCands[0]!.provenance.evidence![0]!.startLine).toBe(1); // Excerpt starts context-offset back, 3 - 2 = 1
    expect(mainCands[0]!.ambiguity).not.toContain("test-scope");

    // Verify test-scope
    const testCands = candidates.filter((c) => {
      const ev = c.provenance.evidence?.[0];
      return ev?.locator.includes("app.test.ts") ?? false;
    });
    expect(testCands).toHaveLength(1);
    expect(testCands[0]!.ambiguity).toContain("test-scope");
  });
});
