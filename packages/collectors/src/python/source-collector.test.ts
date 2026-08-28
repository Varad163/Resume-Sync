import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import type { GitRepositoryTarget } from "@ironbastion/core";
import { pythonSourceCollector } from "./source-collector.js";
import { scanPythonSource } from "./rules.js";
import { ALL_COLLECTORS } from "../index.js";
import type { CollectorContext } from "../shared/types.js";

const tmpDir = path.resolve("./packages/collectors/src/python/tmp_python_test_fixture");

const target: GitRepositoryTarget = {
  kind: "git-repository",
  id: "repo_python_fixture",
  name: "acme-python-source",
  localPath: tmpDir,
};

const ctx: CollectorContext = {
  scanId: "scan_python_source",
  metadataOnly: false,
  now: () => "2026-08-22T00:00:00.000Z",
};

describe("ALL_COLLECTORS registration", () => {
  it("registers pythonSourceCollector in ALL_COLLECTORS", () => {
    expect(ALL_COLLECTORS.map((c) => c.id)).toContain("python-source");
  });
});

describe("python source scan rules", () => {
  it("detects Fernet calls", () => {
    const code = "cipher = Fernet(key)";
    const det = scanPythonSource(code);
    expect(det).toHaveLength(1);
    expect(det[0]!.ruleId).toBe("PYTHON-FERNET");
    expect(det[0]!.algorithm).toBe("AES-CBC");
  });

  it("detects AES cipher and mode", () => {
    const code = "cipher = Cipher(algorithms.AES(key), modes.CBC(iv))";
    const det = scanPythonSource(code);
    expect(det).toHaveLength(1);
    expect(det[0]!.algorithm).toBe("AES-CBC");
  });

  it("detects hashlib static and dynamic algorithms", () => {
    const code1 = "hashlib.sha256(data)";
    const det1 = scanPythonSource(code1);
    expect(det1).toHaveLength(1);
    expect(det1[0]!.algorithm).toBe("SHA256");

    const code2 = "hashlib.new('sha512')";
    const det2 = scanPythonSource(code2);
    expect(det2).toHaveLength(1);
    expect(det2[0]!.algorithm).toBe("SHA512");
  });
});

describe("pythonSourceCollector file scanning", () => {
  beforeAll(async () => {
    await mkdir(tmpDir, { recursive: true });

    // 1. Create main app file
    const mainContent = [
      "import hashlib",
      "from cryptography.fernet import Fernet",
      "",
      "def run():",
      "    key = Fernet.generate_key()",
      "    f = Fernet(key) # line 6",
      "    print(hashlib.sha256(b'hello').hexdigest()) # line 7",
    ].join("\n");
    await writeFile(path.join(tmpDir, "main.py"), mainContent, "utf8");

    // 2. Create a test file
    const testDir = path.join(tmpDir, "tests");
    await mkdir(testDir, { recursive: true });
    const testContent = [
      "def test_crypto():",
      "    f = Fernet(b'fakekey')",
    ].join("\n");
    await writeFile(path.join(testDir, "test_app.py"), testContent, "utf8");

    // 3. Create a fake .venv file to ignore
    const venvDir = path.join(tmpDir, ".venv");
    await mkdir(venvDir, { recursive: true });
    await writeFile(path.join(venvDir, "ignored.py"), "f = Fernet(b'ignored')", "utf8");
  });

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("scans Python source files, ignores venv, and flags test-scope", async () => {
    const out = await pythonSourceCollector.collect(target, ctx);
    // Should scan main.py and tests/test_app.py, but ignore .venv/ignored.py
    expect(out.unitsScanned).toBe(2);

    const candidates = out.candidates;
    // main.py: Fernet (line 6), sha256 (line 7)
    // tests/test_app.py: Fernet (line 2)
    expect(candidates).toHaveLength(3);

    // Verify main.py findings
    const mainCands = candidates.filter((c) => {
      const ev = c.provenance.evidence?.[0];
      return ev?.locator === "main.py";
    });
    expect(mainCands).toHaveLength(2);
    
    const fernetMain = mainCands.find((c) => c.provenance.ruleId === "PYTHON-FERNET");
    expect(fernetMain).toBeDefined();
    expect(fernetMain!.provenance.evidence![0]!.startLine).toBe(4);
    expect(fernetMain!.ambiguity).not.toContain("test-scope");

    const sha256Main = mainCands.find((c) => c.provenance.ruleId === "PYTHON-HASH");
    expect(sha256Main).toBeDefined();
    expect(sha256Main!.provenance.evidence![0]!.startLine).toBe(5);

    // Verify test file findings (test-scope)
    const testCands = candidates.filter((c) => {
      const ev = c.provenance.evidence?.[0];
      return ev?.locator.includes("test_app.py") ?? false;
    });
    expect(testCands).toHaveLength(1);
    expect(testCands[0]!.ambiguity).toContain("test-scope");
  });
});
