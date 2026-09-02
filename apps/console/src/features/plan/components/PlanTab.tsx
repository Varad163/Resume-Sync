import { useEffect, useState } from "react";
import type { MigrationPlan } from "@ironbastion/core";
import { api } from "../../../api.js";
import { Empty } from "../../../components.js";
import { EFFORT_DAYS, moveMigrationAction } from "../utils/planCalculations.js";

export function Plan({
  scanId,
  plan,
  customPlan,
  onPlanChange,
}: {
  scanId: string;
  plan?: MigrationPlan;
  customPlan: MigrationPlan | null;
  onPlanChange: (p: MigrationPlan | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [localPlan, setLocalPlan] = useState<MigrationPlan | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const currentPlan = customPlan ?? plan;

  useEffect(() => {
    if (currentPlan) {
      setLocalPlan(JSON.parse(JSON.stringify(currentPlan)));
    }
  }, [currentPlan, editing]);

  if (!plan) return <Empty title="No plan yet"><p>The migration plan is produced after findings are scored.</p></Empty>;

  const displayPlan = editing ? localPlan : currentPlan;
  if (!displayPlan) return null;

  const handleMoveAction = (actionId: string, targetWaveId: string) => {
    if (!localPlan) return;
    try {
      const nextPlan = moveMigrationAction(localPlan, actionId, targetWaveId);
      setLocalPlan(nextPlan);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    if (!localPlan) return;
    setSaving(true);
    setError(undefined);
    try {
      const res = await api.saveCustomPlan(scanId, localPlan);
      onPlanChange(res.plan);
      setEditing(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Are you sure you want to discard your customizations and reset to the original AI baseline plan?")) return;
    setSaving(true);
    setError(undefined);
    try {
      await api.resetCustomPlan(scanId);
      onPlanChange(null);
      setEditing(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, background: "var(--raised)", padding: "12px 18px", border: "1px solid var(--edge)" }}>
        <div>
          <span className="label" style={{ marginRight: 10 }}>Roadmap:</span>
          {customPlan ? (
            <span style={{ color: "var(--legacy)", fontWeight: "bold", fontSize: 13, fontFamily: "var(--mono)" }}>Customized Roadmap</span>
          ) : (
            <span style={{ color: "var(--quantum)", fontSize: 13, fontFamily: "var(--mono)" }}>AI Baseline Roadmap</span>
          )}
          <span style={{ marginLeft: 16, color: "var(--muted)", fontSize: 13 }}>
            Effort: <b>{displayPlan.totalEffortDays} engineer-days</b>
          </span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {error && <span style={{ color: "var(--critical)", fontSize: 12, display: "flex", alignItems: "center" }}>{error}</span>}
          {editing ? (
            <>
              <button className="btn ghost" type="button" disabled={saving} onClick={() => setEditing(false)} style={{ padding: "6px 12px", minWidth: "auto" }}>
                Cancel
              </button>
              <button className="btn primary" type="button" disabled={saving} onClick={handleSave} style={{ padding: "6px 12px", minWidth: "auto" }}>
                {saving ? "Saving…" : "Save Plan"}
              </button>
            </>
          ) : (
            <>
              {customPlan && (
                <button className="btn ghost" type="button" disabled={saving} onClick={handleReset} style={{ padding: "6px 12px", minWidth: "auto", color: "var(--critical)", borderColor: "var(--critical)" }}>
                  Reset to Baseline
                </button>
              )}
              <button className="btn primary" type="button" onClick={() => setEditing(true)} style={{ padding: "6px 12px", minWidth: "auto" }}>
                Edit Roadmap
              </button>
            </>
          )}
        </div>
      </div>

      <p style={{ color: "var(--body)", fontSize: 14, maxWidth: "78ch", marginBottom: 24 }}>
        {displayPlan.summary}
      </p>

      {displayPlan.waves.map((wave) => (
        <section className="wave" key={wave.id}>
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h3>{wave.name}</h3>
              <p className="why">{wave.rationale}</p>
            </div>
            <div className="mono label" style={{ fontSize: 11, color: "var(--display)", background: "var(--raised)", padding: "4px 8px" }}>
              Wave Effort: {wave.actions.reduce((sum, a) => sum + EFFORT_DAYS[a.effort as keyof typeof EFFORT_DAYS], 0)} days
            </div>
          </header>
          {wave.actions.length === 0 ? (
            <div style={{ padding: "20px", border: "1px dashed var(--edge)", textAlign: "center", color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>
              No actions assigned to this wave.
            </div>
          ) : (
            <table className="data" style={{ marginBottom: 20 }}>
              <thead>
                <tr>
                  <th style={{ width: 50 }}>Size</th>
                  <th>Component</th>
                  <th style={{ width: 230 }}>Change</th>
                  <th style={{ width: 150 }}>Approach</th>
                  {editing && <th style={{ width: 140 }}>Target Wave</th>}
                </tr>
              </thead>
              <tbody>
                {wave.actions.map((action) => (
                  <tr key={action.id}>
                    <td className="mono" style={{ color: "var(--display)" }}>
                      {action.effort}
                    </td>
                    <td>
                      <div className="title">{action.component}</div>
                      <div className="where">{action.rationale}</div>
                    </td>
                    <td className="mono" style={{ fontSize: 12 }}>
                      {action.currentAlgorithm}{" "}
                      <span style={{ color: "var(--quantum)" }}>→ {action.targetAlgorithm}</span>
                    </td>
                    <td className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                      {action.approach}
                    </td>
                    {editing && (
                      <td>
                        <select
                          value={wave.id}
                          style={{
                            background: "var(--void)",
                            color: "var(--display)",
                            border: "1px solid var(--hairline)",
                            padding: "4px 8px",
                            fontFamily: "var(--mono)",
                            fontSize: 11,
                            width: "100%",
                          }}
                          onChange={(e) => handleMoveAction(action.id, e.target.value)}
                        >
                          {displayPlan.waves.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.name}
                            </option>
                          ))}
                        </select>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ))}
    </>
  );
}
