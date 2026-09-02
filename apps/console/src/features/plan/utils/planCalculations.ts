import type { MigrationAction, MigrationPlan } from "@ironbastion/core";

export const EFFORT_DAYS = { S: 2, M: 8, L: 25, XL: 60 } as const;

export function moveMigrationAction(
  plan: MigrationPlan,
  actionId: string,
  targetWaveId: string,
): MigrationPlan {
  let foundAction: MigrationAction | undefined;
  for (const wave of plan.waves) {
    const action = wave.actions.find((a) => a.id === actionId);
    if (action) {
      foundAction = action;
      break;
    }
  }

  if (!foundAction) {
    throw new Error(`Migration action with ID ${actionId} not found in the plan.`);
  }

  const newWaves = plan.waves.map((wave) => {
    const isSourceWave = wave.actions.some((a) => a.id === actionId);
    const isTargetWave = wave.id === targetWaveId;

    let nextActions = wave.actions;
    if (isSourceWave) {
      nextActions = nextActions.filter((a) => a.id !== actionId);
    }
    if (isTargetWave) {
      if (!nextActions.some((a) => a.id === actionId)) {
        nextActions = [...nextActions, foundAction!];
      }
    }

    return {
      ...wave,
      actions: nextActions,
    };
  });

  const allActions = newWaves.flatMap((w) => w.actions);
  const totalEffortDays = allActions.reduce(
    (sum, a) => sum + EFFORT_DAYS[a.effort as keyof typeof EFFORT_DAYS],
    0,
  );

  const milestoneRisks = plan.milestoneRisks.map((risk) => {
    if (risk.milestoneId === "deprecation-2030") {
      return {
        ...risk,
        atRisk: totalEffortDays > 250,
        reason: `Estimated ${totalEffortDays} engineer-days against the 2030 deprecation milestone.`,
      };
    }
    return risk;
  });

  return {
    ...plan,
    waves: newWaves,
    totalEffortDays,
    milestoneRisks,
  };
}
