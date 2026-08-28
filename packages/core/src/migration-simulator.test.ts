import { describe, expect, it } from "vitest";
import { moveMigrationAction, validateMigrationPlanIntegrity } from "./migration-simulator.js";
import type { MigrationPlan } from "./migration.js";

const mockPlan = (): MigrationPlan => {
  return {
    scanId: "scan_123",
    generatedAt: new Date().toISOString(),
    summary: "Mock plan summary",
    totalEffortDays: 33, // 1 L (25) + 1 M (8)
    milestoneRisks: [
      {
        milestoneId: "deprecation-2030",
        atRisk: false,
        reason: "Estimated days under 250",
      },
    ],
    provenance: {
      source: "agent",
      agentId: "agent_migrate",
      model: "model_migrate",
      promptVersion: "1.0",
      inputTokens: 10,
      outputTokens: 10,
      rationale: "",
      decidedAt: new Date().toISOString(),
    },
    waves: [
      {
        id: "wave_1",
        name: "Wave 1",
        rationale: "Rationale 1",
        milestoneId: "deprecation-2030",
        actions: [
          {
            id: "action_aes",
            findingIds: ["f1"],
            component: "auth",
            currentAlgorithm: "AES-128",
            targetAlgorithm: "AES-256",
            approach: "parameter-change",
            effort: "M", // 8 days
            severity: "medium",
            rationale: "",
            dependsOn: [],
            risks: [],
            validation: [],
          },
        ],
      },
      {
        id: "wave_2",
        name: "Wave 2",
        rationale: "Rationale 2",
        milestoneId: "deprecation-2030",
        actions: [
          {
            id: "action_rsa",
            findingIds: ["f2"],
            component: "ledger",
            currentAlgorithm: "RSA-1024",
            targetAlgorithm: "ML-KEM-768",
            approach: "re-architect",
            effort: "L", // 25 days
            severity: "critical",
            rationale: "",
            dependsOn: [],
            risks: [],
            validation: [],
          },
        ],
      },
    ],
  };
};

describe("Migration Plan Simulator module", () => {
  it("reassigns a migration action between waves and maintains total effort", () => {
    const original = mockPlan();
    expect(original.waves[0]!.actions).toHaveLength(1);
    expect(original.waves[1]!.actions).toHaveLength(1);

    // Move RSA action from Wave 2 to Wave 1
    const updated = moveMigrationAction(original, "action_rsa", "wave_1");

    // Wave 1 should now have 2 actions, Wave 2 should have 0
    expect(updated.waves[0]!.actions).toHaveLength(2);
    expect(updated.waves[1]!.actions).toHaveLength(0);
    expect(updated.waves[0]!.actions.map((a) => a.id)).toContain("action_rsa");

    // Total effort stays consistent at 33 days (8 + 25)
    expect(updated.totalEffortDays).toBe(33);
  });

  it("updates milestone risks if total days exceed 250", () => {
    const original = mockPlan();

    // Modify the action in-place to have XL effort (60 days) to simulate high effort, but let's test moving.
    // Let's create a custom high-effort plan to test milestone triggers.
    const highEffortPlan: MigrationPlan = {
      ...original,
      waves: [
        {
          ...original.waves[0]!,
          actions: [
            {
              ...original.waves[0]!.actions[0]!,
              effort: "XL", // 60 days
            },
          ],
        },
        {
          ...original.waves[1]!,
          actions: [
            {
              ...original.waves[1]!.actions[0]!,
              effort: "XL", // 60 days
            },
            {
              id: "action_huge",
              findingIds: ["f3"],
              component: "vault",
              currentAlgorithm: "3DES",
              targetAlgorithm: "AES-256",
              approach: "re-architect",
              effort: "XL", // 60 days
              severity: "critical",
              rationale: "",
              dependsOn: [],
              risks: [],
              validation: [],
            },
            {
              id: "action_massive",
              findingIds: ["f4"],
              component: "database",
              currentAlgorithm: "SHA-1",
              targetAlgorithm: "SHA-256",
              approach: "re-architect",
              effort: "XL", // 60 days
              severity: "high",
              rationale: "",
              dependsOn: [],
              risks: [],
              validation: [],
            },
            {
              id: "action_giant",
              findingIds: ["f5"],
              component: "infra",
              currentAlgorithm: "RSA-2048",
              targetAlgorithm: "ML-DSA-65",
              approach: "re-architect",
              effort: "XL", // 60 days
              severity: "high",
              rationale: "",
              dependsOn: [],
              risks: [],
              validation: [],
            },
          ],
        },
      ],
      totalEffortDays: 300, // 5 * 60 = 300 days
    };

    const updated = moveMigrationAction(highEffortPlan, "action_huge", "wave_1");
    expect(updated.totalEffortDays).toBe(300);
    expect(updated.milestoneRisks[0]!.atRisk).toBe(true);
    expect(updated.milestoneRisks[0]!.reason).toContain("Estimated 300 engineer-days");
  });

  it("validates plan integrity and rejects tampered updates", () => {
    const original = mockPlan();

    // Correctly moved action is valid
    const updated = moveMigrationAction(original, "action_rsa", "wave_1");
    expect(validateMigrationPlanIntegrity(original, updated)).toBe(true);

    // Tampering by altering effort size should be rejected
    const tamperedEffort = {
      ...updated,
      waves: updated.waves.map((w) => ({
        ...w,
        actions: w.actions.map((a) => (a.id === "action_rsa" ? { ...a, effort: "S" as const } : a)),
      })),
    };
    expect(validateMigrationPlanIntegrity(original, tamperedEffort)).toBe(false);

    // Tampering by losing an action should be rejected
    const tamperedLostAction = {
      ...updated,
      waves: updated.waves.map((w) => ({
        ...w,
        actions: w.actions.filter((a) => a.id !== "action_rsa"),
      })),
    };
    expect(validateMigrationPlanIntegrity(original, tamperedLostAction)).toBe(false);
  });
});
