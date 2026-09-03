import { describe, expect, it } from "vitest";
import type { MigrationPlan } from "@ironbastion/core";
import { EFFORT_DAYS, moveMigrationAction } from "./planCalculations.js";

const samplePlan: MigrationPlan = {
  scanId: "scan_1",
  generatedAt: new Date().toISOString(),
  summary: "Sample migration plan",
  provenance: {
    source: "agent",
    agentId: "migrate",
    model: "claude-3-5-sonnet",
    promptVersion: "1.0",
    inputTokens: 100,
    outputTokens: 200,
    rationale: "Automated sequence",
    decidedAt: new Date().toISOString(),
  },
  waves: [
    {
      id: "wave-1",
      name: "Wave 1 - Immediate",
      rationale: "Critical endpoints",
      milestoneId: "inventory-2026",
      actions: [
        {
          id: "act-1",
          findingIds: ["f-1"],
          component: "API Gateway",
          currentAlgorithm: "RSA-2048",
          targetAlgorithm: "ML-KEM-768",
          approach: "hybrid",
          effort: "M",
          severity: "critical",
          rationale: "Public facing",
          dependsOn: [],
          risks: [],
          validation: [],
        },
      ],
    },
    {
      id: "wave-2",
      name: "Wave 2 - Secondary",
      rationale: "Internal services",
      milestoneId: "high-priority-2028",
      actions: [
        {
          id: "act-2",
          findingIds: ["f-2"],
          component: "Auth Service",
          currentAlgorithm: "ECDSA-P256",
          targetAlgorithm: "ML-DSA-65",
          approach: "protocol-upgrade",
          effort: "L",
          severity: "high",
          rationale: "Token signing",
          dependsOn: [],
          risks: [],
          validation: [],
        },
      ],
    },
  ],
  totalEffortDays: 33, // 8 (M) + 25 (L)
  milestoneRisks: [
    {
      milestoneId: "deprecation-2030",
      atRisk: false,
      reason: "Estimated 33 engineer-days against the 2030 deprecation milestone.",
    },
  ],
};

describe("planCalculations", () => {
  it("exports correct EFFORT_DAYS constants", () => {
    expect(EFFORT_DAYS).toEqual({ S: 2, M: 8, L: 25, XL: 60 });
  });

  it("moves an action between waves correctly", () => {
    const updated = moveMigrationAction(samplePlan, "act-1", "wave-2");
    const wave1 = updated.waves.find((w) => w.id === "wave-1")!;
    const wave2 = updated.waves.find((w) => w.id === "wave-2")!;

    expect(wave1.actions).toHaveLength(0);
    expect(wave2.actions).toHaveLength(2);
    expect(wave2.actions.map((a) => a.id)).toContain("act-1");
  });

  it("recalculates total effort days accurately", () => {
    const updated = moveMigrationAction(samplePlan, "act-1", "wave-2");
    // total effort is still M (8) + L (25) = 33
    expect(updated.totalEffortDays).toBe(33);
  });

  it("updates milestone risk when total effort exceeds 250 days", () => {
    const heavyPlan: MigrationPlan = {
      ...samplePlan,
      waves: [
        {
          id: "wave-1",
          name: "Wave 1",
          rationale: "Heavy load",
          milestoneId: "inventory-2026",
          actions: [
            {
              id: "act-xl1",
              findingIds: ["f-xl1"],
              component: "Comp 1",
              currentAlgorithm: "RSA-4096",
              targetAlgorithm: "ML-KEM-1024",
              approach: "re-architect",
              effort: "XL", // 60
              severity: "critical",
              rationale: "Core",
              dependsOn: [],
              risks: [],
              validation: [],
            },
            {
              id: "act-xl2",
              findingIds: ["f-xl2"],
              component: "Comp 2",
              currentAlgorithm: "RSA-4096",
              targetAlgorithm: "ML-KEM-1024",
              approach: "re-architect",
              effort: "XL", // 60
              severity: "critical",
              rationale: "Core",
              dependsOn: [],
              risks: [],
              validation: [],
            },
            {
              id: "act-xl3",
              findingIds: ["f-xl3"],
              component: "Comp 3",
              currentAlgorithm: "RSA-4096",
              targetAlgorithm: "ML-KEM-1024",
              approach: "re-architect",
              effort: "XL", // 60
              severity: "critical",
              rationale: "Core",
              dependsOn: [],
              risks: [],
              validation: [],
            },
            {
              id: "act-xl4",
              findingIds: ["f-xl4"],
              component: "Comp 4",
              currentAlgorithm: "RSA-4096",
              targetAlgorithm: "ML-KEM-1024",
              approach: "re-architect",
              effort: "XL", // 60
              severity: "critical",
              rationale: "Core",
              dependsOn: [],
              risks: [],
              validation: [],
            },
            {
              id: "act-xl5",
              findingIds: ["f-xl5"],
              component: "Comp 5",
              currentAlgorithm: "RSA-4096",
              targetAlgorithm: "ML-KEM-1024",
              approach: "re-architect",
              effort: "XL", // 60 (total 300 > 250)
              severity: "critical",
              rationale: "Core",
              dependsOn: [],
              risks: [],
              validation: [],
            },
          ],
        },
        {
          id: "wave-2",
          name: "Wave 2",
          rationale: "Empty target",
          milestoneId: "high-priority-2028",
          actions: [],
        },
      ],
      totalEffortDays: 300,
      milestoneRisks: [
        {
          milestoneId: "deprecation-2030",
          atRisk: false,
          reason: "Initial reason",
        },
      ],
    };

    const updated = moveMigrationAction(heavyPlan, "act-xl5", "wave-2");
    expect(updated.totalEffortDays).toBe(300);
    const deprecationRisk = updated.milestoneRisks.find((r) => r.milestoneId === "deprecation-2030")!;
    expect(deprecationRisk.atRisk).toBe(true);
    expect(deprecationRisk.reason).toContain("Estimated 300 engineer-days");
  });

  it("throws an error when action ID is not found in plan", () => {
    expect(() => moveMigrationAction(samplePlan, "non-existent-action", "wave-1")).toThrow(
      "Migration action with ID non-existent-action not found in the plan.",
    );
  });

  it("regression: preserves action wave selection across background polling re-renders and saves custom plan", () => {
    // 1. Render a migration action initially in "Highest exposure first" (wave-1)
    const initialPlan: MigrationPlan = {
      ...samplePlan,
      waves: [
        {
          id: "wave-1",
          name: "Highest exposure first",
          rationale: "Critical endpoints",
          milestoneId: "inventory-2026",
          actions: [
            {
              id: "act-1",
              findingIds: ["f-1"],
              component: "API Gateway",
              currentAlgorithm: "RSA-2048",
              targetAlgorithm: "ML-KEM-768",
              approach: "hybrid",
              effort: "M",
              severity: "critical",
              rationale: "Public facing",
              dependsOn: [],
              risks: [],
              validation: [],
            },
            {
              id: "act-other",
              findingIds: ["f-3"],
              component: "Database",
              currentAlgorithm: "AES-128",
              targetAlgorithm: "AES-256",
              approach: "parameter-change",
              effort: "S",
              severity: "medium",
              rationale: "Internal storage",
              dependsOn: [],
              risks: [],
              validation: [],
            },
          ],
        },
        {
          id: "wave-2",
          name: "Remaining quantum-vulnerable cryptography",
          rationale: "Secondary services",
          milestoneId: "high-priority-2028",
          actions: [
            {
              id: "act-2",
              findingIds: ["f-2"],
              component: "Auth Service",
              currentAlgorithm: "ECDSA-P256",
              targetAlgorithm: "ML-DSA-65",
              approach: "protocol-upgrade",
              effort: "L",
              severity: "high",
              rationale: "Token signing",
              dependsOn: [],
              risks: [],
              validation: [],
            },
          ],
        },
      ],
    };

    const initialWave1 = initialPlan.waves.find((w) => w.id === "wave-1")!;
    expect(initialWave1.actions.map((a) => a.id)).toContain("act-1");

    // 2. Change target wave to "Remaining quantum-vulnerable cryptography" (wave-2)
    let editing = true;
    let localPlan: MigrationPlan | null = JSON.parse(JSON.stringify(initialPlan));
    localPlan = moveMigrationAction(localPlan!, "act-1", "wave-2");

    // 3. Verify selected value remains "Remaining quantum-vulnerable cryptography"
    const wave1AfterMove = localPlan.waves.find((w) => w.id === "wave-1")!;
    const wave2AfterMove = localPlan.waves.find((w) => w.id === "wave-2")!;
    expect(wave1AfterMove.actions.map((a) => a.id)).not.toContain("act-1");
    expect(wave2AfterMove.actions.map((a) => a.id)).toContain("act-1");

    // 4 & 5. Trigger a simulated background poll / component rerender
    const serverPolledPlan: MigrationPlan = JSON.parse(JSON.stringify(initialPlan));
    const syncLocalPlanState = (prev: MigrationPlan | null, currentPlan: MigrationPlan) => {
      if (editing) {
        return prev ?? JSON.parse(JSON.stringify(currentPlan));
      }
      return null;
    };
    localPlan = syncLocalPlanState(localPlan, serverPolledPlan);

    // Verify it still remains selected
    const wave2AfterRerender = localPlan!.waves.find((w) => w.id === "wave-2")!;
    expect(wave2AfterRerender.actions.map((a) => a.id)).toContain("act-1");

    // 6. Verify other migration actions are unchanged
    const wave1AfterRerender = localPlan!.waves.find((w) => w.id === "wave-1")!;
    expect(wave1AfterRerender.actions.map((a) => a.id)).toEqual(["act-other"]);
    expect(wave2AfterRerender.actions.map((a) => a.id)).toEqual(["act-2", "act-1"]);

    // 7. Save custom plan and verify changed action is persisted
    const savedCustomPlan = JSON.parse(JSON.stringify(localPlan));
    editing = false;
    localPlan = syncLocalPlanState(localPlan, savedCustomPlan);
    expect(localPlan).toBeNull();

    const finalWave2 = savedCustomPlan.waves.find((w: { id: string }) => w.id === "wave-2")!;
    expect(finalWave2.actions.map((a: { id: string }) => a.id)).toContain("act-1");
  });
});
