import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_SCAN_OPTIONS,
  EMPTY_STATS,
  type Finding,
  type GitRepositoryTarget,
  type ScanRecord,
} from "@ironbastion/core";
import { validateVerdicts } from "./sentinel.js";
import { validateAssessments } from "./oracle.js";
import { validatePlan, sanctionedReplacements } from "./migrate.js";
import { validateSummary } from "./atlas.js";
import { deterministicAdjudicate, deterministicAssess, DETERMINISTIC_MODEL } from "./deterministic.js";
import { runCampaign } from "./campaign.js";

const repoRoot = fileURLToPath(new URL("../../../fixtures/java-payments", import.meta.url));

const target: GitRepositoryTarget = {
  kind: "git-repository",
  id: "repo_1",
  name: "acme-payments",
  localPath: repoRoot,
};

const scan: ScanRecord = {
  id: "scan_camp",
  tenantId: "t1",
  projectId: "proj_1",
  status: "running",
  phase: "DISCOVER",
  targets: [target],
  options: DEFAULT_SCAN_OPTIONS,
  startedAt: "2026-08-22T10:00:00.000Z",
  stats: EMPTY_STATS,
};

describe("SENTINEL submission validation", () => {
  const known = new Set(["cand_a", "cand_b"]);

  it("accepts a complete, well-formed set of verdicts", () => {
    const result = validateVerdicts(
      {
        verdicts: [
          { candidate_id: "cand_a", status: "confirmed", confidence: 0.9, reachability: "runtime", rationale: "read Vault.java:12" },
          { candidate_id: "cand_b", status: "rejected", confidence: 0.8, reachability: "dead-code", rationale: "commented out" },
        ],
      },
      known,
    );
    expect(result.ok).toBe(true);
  });

  it("refuses a candidate id the agent was never given", () => {
    const result = validateVerdicts(
      { verdicts: [{ candidate_id: "cand_invented", status: "confirmed", confidence: 1, reachability: "runtime", rationale: "x" }] },
      known,
    );
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.error).toContain("not in the list you were given");
  });

  it("refuses a partial answer", () => {
    const result = validateVerdicts(
      { verdicts: [{ candidate_id: "cand_a", status: "confirmed", confidence: 1, reachability: "runtime", rationale: "x" }] },
      known,
    );
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.error).toContain("missing verdicts");
  });

  it("refuses a verdict with no rationale, a bad status or an out-of-range confidence", () => {
    const base = { candidate_id: "cand_a", status: "confirmed", confidence: 0.5, reachability: "runtime", rationale: "x" };
    expect(validateVerdicts({ verdicts: [{ ...base, rationale: "" }] }, new Set(["cand_a"])).ok).toBe(false);
    expect(validateVerdicts({ verdicts: [{ ...base, status: "probably" }] }, new Set(["cand_a"])).ok).toBe(false);
    expect(validateVerdicts({ verdicts: [{ ...base, confidence: 7 }] }, new Set(["cand_a"])).ok).toBe(false);
  });

  it("refuses duplicates", () => {
    const one = { candidate_id: "cand_a", status: "confirmed", confidence: 0.5, reachability: "runtime", rationale: "x" };
    const result = validateVerdicts({ verdicts: [one, one] }, new Set(["cand_a"]));
    expect(result).toMatchObject({ ok: false });
  });
});

describe("ORACLE submission validation", () => {
  it("requires a recognised lifetime and exposure", () => {
    const known = new Set(["c1"]);
    const good = validateAssessments(
      { assessments: [{ candidate_id: "c1", data_lifetime: "long", exposure: "external", confidence: 0.7, rationale: "payment records" }] },
      known,
    );
    expect(good.ok).toBe(true);
    const bad = validateAssessments(
      { assessments: [{ candidate_id: "c1", data_lifetime: "forever", exposure: "external", confidence: 0.7, rationale: "x" }] },
      known,
    );
    expect(bad.ok).toBe(false);
  });
});

describe("MIGRATE guardrails", () => {
  const finding = (id: string, algorithm: string, keySize?: number): Finding =>
    ({
      id,
      scanId: scan.id,
      algorithm,
      primitive: "public-key-encryption",
      parameters: keySize ? { keySize } : {},
      quantum: "broken",
      title: algorithm,
      description: "",
      component: "acme/payments",
      ambiguity: [],
      provenance: { source: "collector", collectorId: "jvm-source", collectorVersion: "1", ruleId: "R", confidence: 1, evidence: [] },
      adjudication: {
        status: "confirmed",
        confidence: 1,
        reachability: "runtime",
        dataLifetime: "long",
        exposure: "external",
        rationale: "",
        provenance: { source: "agent", agentId: "sentinel", model: "claude-opus-5", promptVersion: "1", inputTokens: 0, outputTokens: 0, rationale: "", decidedAt: scan.startedAt },
      },
      risk: { score: 90, severity: "critical", factors: { quantumExposure: 1, dataLifetime: 1, reachability: 1, networkExposure: 1, migrationDifficulty: 1 }, explanation: "" },
    }) as Finding;

  const findings = [finding("f1", "RSA", 2048)];
  const sanctioned = sanctionedReplacements(findings);
  const known = new Set(findings.map((f) => f.id));

  const plan = (targetAlgorithm: string, extra: Record<string, unknown> = {}) => ({
    summary: "Move RSA first.",
    waves: [
      {
        id: "wave-1",
        name: "Key transport",
        rationale: "External and long-lived.",
        milestone_id: "high-priority-2028",
        actions: [
          {
            id: "a1",
            finding_ids: ["f1"],
            component: "acme/payments",
            current_algorithm: "RSA",
            target_algorithm: targetAlgorithm,
            approach: "hybrid",
            effort: "L",
            rationale: "Wrap with ML-KEM.",
            depends_on: [],
            risks: ["format change"],
            validation: ["re-scan"],
            ...extra,
          },
        ],
      },
    ],
    milestone_risks: [],
  });

  it("accepts the sanctioned replacement", () => {
    expect(validatePlan(plan("ML-KEM-768"), known, sanctioned).ok).toBe(true);
  });

  it("rejects an algorithm the standards do not sanction, and says which to use", () => {
    const result = validatePlan(plan("ML-KEM-512"), known, sanctioned);
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.error).toContain("sanctioned replacement is ML-KEM-768");
  });

  it("rejects a plan that invents a finding id", () => {
    const result = validatePlan(plan("ML-KEM-768", { finding_ids: ["f_nope"] }), known, sanctioned);
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.error).toContain("unknown finding_id");
  });

  it("rejects a dependency on an action that does not exist", () => {
    const result = validatePlan(plan("ML-KEM-768", { depends_on: ["a99"] }), known, sanctioned);
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.error).toContain("depends on unknown action");
  });

  it("rejects a wave aimed at no milestone", () => {
    const broken = plan("ML-KEM-768");
    broken.waves[0]!.milestone_id = "some-day";
    expect(validatePlan(broken, known, sanctioned).ok).toBe(false);
  });
});

describe("ATLAS submission validation", () => {
  it("requires a summary and at least one observation", () => {
    expect(validateSummary({ summary: "s", observations: ["o"] }).ok).toBe(true);
    expect(validateSummary({ summary: "s", observations: [] }).ok).toBe(false);
    expect(validateSummary({ observations: ["o"] }).ok).toBe(false);
  });
});

describe("the rule-based fallback", () => {
  const candidates = [
    {
      id: "c1",
      scanId: "s",
      algorithm: "RSA",
      primitive: "public-key-encryption" as const,
      parameters: { keySize: 2048 },
      quantum: "broken" as const,
      title: "RSA token wrapping",
      description: "Wraps card tokens",
      component: "acme/payments",
      ambiguity: [],
      provenance: {
        source: "collector" as const,
        collectorId: "jvm-source",
        collectorVersion: "1",
        ruleId: "JVM-CIPHER",
        confidence: 0.95,
        evidence: [{ kind: "source-span" as const, locator: "src/main/java/TokenVault.java", startLine: 4, observedAt: "t" }],
      },
    },
  ];

  it("marks everything it decides as rule-based, never as a model verdict", () => {
    const verdicts = deterministicAdjudicate(candidates);
    expect(verdicts[0]?.rationale).toContain("No model was consulted");
    const assessments = deterministicAssess(candidates);
    expect(assessments[0]?.rationale).toContain("Rule-based impact estimate");
  });

  it("routes an unresolvable algorithm to a human instead of guessing", () => {
    const unresolved = [{ ...candidates[0]!, algorithm: "UNRESOLVED" }];
    expect(deterministicAdjudicate(unresolved)[0]?.status).toBe("needs-human");
  });

  it("infers test-only reachability from the path", () => {
    const inTest = [
      {
        ...candidates[0]!,
        ambiguity: ["test-scope" as const],
      },
    ];
    expect(deterministicAdjudicate(inTest)[0]?.reachability).toBe("test-only");
  });

  it("stays confident about identity but not about impact", () => {
    // A literal getInstance("RSA") is not made uncertain by the absence of a
    // model — but what the cryptography protects genuinely is.
    expect(deterministicAdjudicate(candidates)[0]?.confidence).toBeGreaterThan(0.7);
    expect(deterministicAssess(candidates)[0]?.confidence).toBeLessThan(0.5);
  });

  it("drops identity confidence when something indirects the algorithm", () => {
    const indirect = [{ ...candidates[0]!, ambiguity: ["indirect-algorithm" as const] }];
    expect(deterministicAdjudicate(indirect)[0]?.confidence).toBeLessThan(0.5);
  });
});

describe("runCampaign end to end, on the rule-based path", () => {
  it("discovers, adjudicates, scores, inventories and plans", async () => {
    const result = await runCampaign({ scan, client: null, projectName: "acme-payments" });

    expect(result.scan.status).toBe("succeeded");
    expect(result.candidates.length).toBeGreaterThan(10);
    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.cbom.specVersion).toBe("1.6");
    expect(result.cbom.components.length).toBeGreaterThan(0);
    expect(result.plan.waves.length).toBeGreaterThan(0);
    expect(result.posture.severity).toBeTruthy();
  });

  it("records every phase in order", async () => {
    const phases: string[] = [];
    await runCampaign({ scan, client: null, projectName: "acme", onPhase: (p) => phases.push(p) });
    expect(phases).toEqual(["DISCOVER", "ANALYZE", "PLAN", "REPORT", "DONE"]);
  });

  it("attributes every finding to the rule-based judge, not to a model", async () => {
    const result = await runCampaign({ scan, client: null, projectName: "acme" });
    for (const finding of result.findings) {
      expect(finding.adjudication.provenance.model).toBe(DETERMINISTIC_MODEL);
    }
    expect(result.modelJudged).toBe(0);
    expect(result.ruleJudged).toBeGreaterThan(0);
    expect(result.notes.join(" ")).toContain("judged by rules rather than a model");
  });

  it("spends nothing when no model is configured", async () => {
    const result = await runCampaign({ scan, client: null, projectName: "acme" });
    expect(result.scan.stats.costCents).toBe(0);
    expect(result.scan.stats.inputTokens).toBe(0);
  });

  it("holds back low-confidence findings for human review", async () => {
    const result = await runCampaign({ scan, client: null, projectName: "acme" });
    expect(result.needsHuman.length).toBeGreaterThan(0);
    for (const finding of result.findings) {
      expect(finding.adjudication.status).toBe("confirmed");
    }
  });

  it("recommends a standardised replacement for quantum-vulnerable findings", async () => {
    const result = await runCampaign({ scan, client: null, projectName: "acme" });
    const rsa = result.findings.find((f) => f.algorithm === "RSA");
    expect(rsa?.recommendedAlgorithm).toBe("ML-KEM-768");
  });

  it("produces a plan whose actions all reference real findings", async () => {
    const result = await runCampaign({ scan, client: null, projectName: "acme" });
    const ids = new Set(result.findings.map((f) => f.id));
    for (const wave of result.plan.waves) {
      for (const action of wave.actions) {
        expect(action.findingIds.length).toBeGreaterThan(0);
        for (const id of action.findingIds) expect(ids.has(id)).toBe(true);
      }
    }
    expect(result.plan.totalEffortDays).toBeGreaterThan(0);
  });

  it("withholds source text from evidence in metadata-only mode", async () => {
    const result = await runCampaign({
      scan: { ...scan, options: { ...DEFAULT_SCAN_OPTIONS, metadataOnly: true } },
      client: null,
      projectName: "acme",
    });
    for (const finding of result.findings) {
      for (const evidence of finding.provenance.evidence) {
        expect(evidence.snippet).toBeUndefined();
      }
    }
  });
});
