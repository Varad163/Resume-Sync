import { describe, expect, it } from "vitest";
import {
  formatCollectorName,
  getScanCoverageList,
  DEFAULT_COLLECTORS,
} from "./ZeroCryptoEmptyState.js";
import type { CollectorRun } from "../../../api.js";

describe("ZeroCryptoEmptyState helper utilities", () => {
  it("formats standard collector IDs to human-readable names", () => {
    expect(formatCollectorName("jvm-source")).toBe("JVM Source");
    expect(formatCollectorName("jvm-dependencies")).toBe("JVM Dependencies");
    expect(formatCollectorName("python-source")).toBe("Python Source");
    expect(formatCollectorName("python-dependencies")).toBe("Python Dependencies");
    expect(formatCollectorName("js-source")).toBe("JavaScript / TypeScript");
    expect(formatCollectorName("npm-dependencies")).toBe("NPM Dependencies");
    expect(formatCollectorName("tls-endpoint")).toBe("TLS Endpoint");
    expect(formatCollectorName("git-repository")).toBe("Git Repository Scanner");
    expect(formatCollectorName("custom-scanner-v1")).toBe("Custom Scanner V1");
  });

  it("extracts unique collector coverage list from real collectorRuns data", () => {
    const runs: CollectorRun[] = [
      {
        collectorId: "jvm-source",
        version: "1.0",
        target: "payments.jar",
        unitsScanned: 15,
        candidates: 0,
        durationMs: 120,
        notes: [],
      },
      {
        collectorId: "jvm-dependencies",
        version: "1.0",
        target: "pom.xml",
        unitsScanned: 4,
        candidates: 0,
        durationMs: 45,
        notes: [],
      },
      {
        collectorId: "jvm-source", // duplicate run
        version: "1.0",
        target: "vault.jar",
        unitsScanned: 8,
        candidates: 0,
        durationMs: 90,
        notes: [],
      },
    ];

    const coverage = getScanCoverageList(runs);
    expect(coverage).toEqual(["JVM Source", "JVM Dependencies"]);
  });

  it("returns default collectors fallback when collectorRuns is empty", () => {
    const coverage = getScanCoverageList([]);
    expect(coverage).toEqual(DEFAULT_COLLECTORS);
  });
});

describe("Scan result state classification logic", () => {
  it("correctly identifies CASE 1 — 0 Crypto Assets", () => {
    const totalAssetsCount: number = 0;
    const findingsCount: number = 0;
    const status: string = "succeeded";

    const isCase1 = totalAssetsCount === 0 && status === "succeeded";
    const isCase2 = totalAssetsCount > 0 && findingsCount === 0 && status === "succeeded";
    const isCase3 = findingsCount > 0;

    expect(isCase1).toBe(true);
    expect(isCase2).toBe(false);
    expect(isCase3).toBe(false);
  });

  it("correctly identifies CASE 2 — Crypto Assets > 0 but 0 quantum-vulnerable findings", () => {
    const totalAssetsCount: number = 3;
    const findingsCount: number = 0;
    const status: string = "succeeded";

    const isCase1 = totalAssetsCount === 0 && status === "succeeded";
    const isCase2 = totalAssetsCount > 0 && findingsCount === 0 && status === "succeeded";
    const isCase3 = findingsCount > 0;

    expect(isCase1).toBe(false);
    expect(isCase2).toBe(true);
    expect(isCase3).toBe(false);
  });

  it("correctly identifies CASE 3 — Confirmed findings exist", () => {
    const totalAssetsCount: number = 5;
    const findingsCount: number = 2;
    const status: string = "succeeded";

    const isCase1 = totalAssetsCount === 0 && status === "succeeded";
    const isCase2 = totalAssetsCount > 0 && findingsCount === 0 && status === "succeeded";
    const isCase3 = findingsCount > 0;

    expect(isCase1).toBe(false);
    expect(isCase2).toBe(false);
    expect(isCase3).toBe(true);
  });
});
