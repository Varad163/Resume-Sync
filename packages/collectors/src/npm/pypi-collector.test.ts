import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import type { GitRepositoryTarget } from "@ironbastion/core";
import { pypiDependencyCollector } from "./pypi-collector.js";
import { matchPypiLibrary } from "../deps/library-registry.js";
import { ALL_COLLECTORS } from "../index.js";
import type { CollectorContext } from "../shared/types.js";

const tmpDir = path.resolve("./packages/collectors/src/npm/tmp_pypi_test_fixture");

const target: GitRepositoryTarget = {
  kind: "git-repository",
  id: "repo_pypi_fixture",
  name: "acme-python-payments",
  localPath: tmpDir,
};

const ctx: CollectorContext = {
  scanId: "scan_pypi_deps",
  metadataOnly: false,
  now: () => "2026-08-22T00:00:00.000Z",
};

describe("ALL_COLLECTORS registration", () => {
  it("registers pypiDependencyCollector in ALL_COLLECTORS", () => {
    expect(ALL_COLLECTORS.map((c) => c.id)).toContain("pypi-deps");
  });
});

describe("library registry pypi matching", () => {
  it("matches PyPI cryptographic packages case-insensitively", () => {
    expect(matchPypiLibrary("cryptography")?.name).toBe("cryptography");
    expect(matchPypiLibrary("Cryptography")?.name).toBe("cryptography");
    expect(matchPypiLibrary("pyjwt")?.name).toBe("pyjwt");
    expect(matchPypiLibrary("unrelated-pkg")).toBeUndefined();
  });
});

describe("pypiDependencyCollector", () => {
  beforeAll(async () => {
    await mkdir(tmpDir, { recursive: true });

    // 1. Create requirements.txt
    const reqContent = [
      "# Standard dependency",
      "cryptography==41.0.3",
      "pyjwt[crypto]~=2.8.0",
      "# Ignored dependency",
      "requests==2.31.0",
      "  # leading space comment",
      "pynacl>=1.5.0",
    ].join("\n");
    await writeFile(path.join(tmpDir, "requirements.txt"), reqContent, "utf8");

    // 2. Create pyproject.toml
    const tomlContent = [
      "[project]",
      "name = 'acme-python-payments'",
      "dependencies = [",
      "    'pycryptodome>=3.18.0',",
      "    'requests',",
      "]",
      "",
      "[tool.poetry.dependencies]",
      "python = '^3.10'",
      "ecdsa = '^0.18.0'",
      "",
      "[tool.poetry.group.dev.dependencies]",
      "bcrypt = '^4.0.1'",
    ].join("\n");
    await writeFile(path.join(tmpDir, "pyproject.toml"), tomlContent, "utf8");

    // 3. Create a fake .venv folder to verify it gets ignored
    const venvDir = path.join(tmpDir, ".venv");
    await mkdir(venvDir, { recursive: true });
    await writeFile(path.join(venvDir, "requirements.txt"), "cryptography==40.0.0", "utf8");
  });

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("scans requirements.txt and pyproject.toml and ignores venv folders", async () => {
    const out = await pypiDependencyCollector.collect(target, ctx);
    // Should scan requirements.txt and pyproject.toml in root, but ignore requirements.txt in .venv
    expect(out.unitsScanned).toBe(2);

    const candidates = out.candidates;
    // requirements.txt: cryptography, pyjwt, pynacl (3)
    // pyproject.toml: pycryptodome, ecdsa, bcrypt (3)
    // requests is ignored (non-crypto)
    expect(candidates).toHaveLength(6);
  });

  it("extracts correct details for requirements.txt findings", async () => {
    const out = await pypiDependencyCollector.collect(target, ctx);
    const candidates = out.candidates.filter((c) => {
      const ev = c.provenance.evidence?.[0];
      return ev?.locator.includes("requirements.txt") ?? false;
    });

    const crypto = candidates.find((c) => c.title.includes("cryptography"));
    expect(crypto).toBeDefined();
    expect(crypto?.algorithm).toBe("LIBRARY");
    expect(crypto?.primitive).toBe("unknown");
    expect(crypto!.provenance.evidence![0]!.startLine).toBe(2);

    const pyjwt = candidates.find((c) => c.title.includes("pyjwt"));
    expect(pyjwt).toBeDefined();
    expect(pyjwt?.algorithm).toBe("RSASSA"); // has defaultAlgorithm
    expect(pyjwt?.primitive).toBe("signature");
    expect(pyjwt!.provenance.evidence![0]!.startLine).toBe(3);

    const pynacl = candidates.find((c) => c.title.includes("pynacl"));
    expect(pynacl).toBeDefined();
    expect(pynacl!.provenance.evidence![0]!.startLine).toBe(7);
  });

  it("extracts correct details and scopes for pyproject.toml findings", async () => {
    const out = await pypiDependencyCollector.collect(target, ctx);
    const candidates = out.candidates.filter((c) => {
      const ev = c.provenance.evidence?.[0];
      return ev?.locator.includes("pyproject.toml") ?? false;
    });

    // Standard array project dependency
    const pycryptodome = candidates.find((c) => c.title.includes("pycryptodome"));
    expect(pycryptodome).toBeDefined();
    expect(pycryptodome!.provenance.evidence![0]!.startLine).toBe(4);
    expect(pycryptodome?.ambiguity).not.toContain("test-scope");

    // Poetry dependency
    const ecdsa = candidates.find((c) => c.title.includes("ecdsa"));
    expect(ecdsa).toBeDefined();
    expect(ecdsa!.provenance.evidence![0]!.startLine).toBe(10);
    expect(ecdsa?.ambiguity).not.toContain("test-scope");

    // Poetry dev group dependency (should be test-scope dev dependency)
    const bcrypt = candidates.find((c) => c.title.includes("bcrypt"));
    expect(bcrypt).toBeDefined();
    expect(bcrypt!.provenance.evidence![0]!.startLine).toBe(13);
    expect(bcrypt?.ambiguity).toContain("test-scope");
  });
});
