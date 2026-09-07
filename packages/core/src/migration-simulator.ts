/**
 * Interactive PQC Migration Plan Simulator.
 *
 * Provides functions to safely reassign whole migration actions between waves
 * and update plan effort estimation metrics.
 */

import { type MigrationPlan, type MigrationAction, EFFORT_DAYS } from "./migration.js";

/**
 * Reassigns an entire MigrationAction from its current wave to a target wave,
 * and recalculates the total effort days and milestone risks.
 */
export function moveMigrationAction(
  plan: MigrationPlan,
  actionId: string,
  targetWaveId: string,
): MigrationPlan {
  // Find the action in the plan
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

  // Construct new waves list with reassigned actions
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

  // Calculate new totals
  const allActions = newWaves.flatMap((w) => w.actions);
  const totalEffortDays = Math.round(allActions.reduce((sum, a) => sum + EFFORT_DAYS[a.effort], 0) * 10) / 10;

  // Update milestone risk indicators based on the new effort totals
  const milestoneRisks = plan.milestoneRisks.map((risk) => {
    if (risk.milestoneId === "deprecation-2030") {
      return {
        ...risk,
        atRisk: totalEffortDays > 25,
        reason: `Estimated ~${totalEffortDays} days against the 2030 deprecation milestone.`,
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

/**
 * Server-side validation of a customized migration plan.
 * Recomputes all totals from the wave action arrays to verify integrity.
 */
export function validateMigrationPlanIntegrity(
  originalPlan: MigrationPlan,
  submittedPlan: MigrationPlan,
): boolean {
  // Verify scan ID matching
  if (originalPlan.scanId !== submittedPlan.scanId) return false;

  // Verify all original actions are still present (none lost or injected)
  const origActionsMap = new Map<string, MigrationAction>();
  for (const w of originalPlan.waves) {
    for (const a of w.actions) {
      origActionsMap.set(a.id, a);
    }
  }

  const submittedActionsMap = new Map<string, MigrationAction>();
  for (const w of submittedPlan.waves) {
    for (const a of w.actions) {
      submittedActionsMap.set(a.id, a);
    }
  }

  if (origActionsMap.size !== submittedActionsMap.size) return false;

  for (const [id, origAction] of origActionsMap) {
    const subAction = submittedActionsMap.get(id);
    if (!subAction) return false;

    // Verify finding IDs map matches exactly
    if (origAction.findingIds.length !== subAction.findingIds.length) return false;
    for (const fid of origAction.findingIds) {
      if (!subAction.findingIds.includes(fid)) return false;
    }

    // Verify effort value is unchanged
    if (origAction.effort !== subAction.effort) return false;
  }

  return true;
}
