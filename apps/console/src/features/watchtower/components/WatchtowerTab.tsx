import { useEffect, useState } from "react";
import {
  api,
  type Project,
  type WatchtowerHistoryItem,
  type WatchtowerResponse,
} from "../../../api.js";
import { Empty, Readout } from "../../../components.js";

export function Watchtower({
  projectId,
  diff,
  onRefresh,
}: {
  projectId: string;
  diff: WatchtowerResponse | null;
  onRefresh: () => Promise<void>;
}) {
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  const [project, setProject] = useState<Project | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [interval, setIntervalVal] = useState(60);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string>();

  useEffect(() => {
    let live = true;
    const fetchProj = async () => {
      try {
        const res = await api.projects();
        const found = res.projects.find((p) => p.id === projectId);
        if (found && live) {
          setProject(found);
          setEnabled(found.monitoringEnabled ?? false);
          setIntervalVal(found.monitoringInterval ?? 60);
        }
      } catch (err) {
        console.error("Failed to load project details", err);
      }
    };
    void fetchProj();
    return () => {
      live = false;
    };
  }, [projectId]);

  const handleSaveSettings = async () => {
    setUpdating(true);
    setUpdateError(undefined);
    try {
      await api.configureMonitoring(projectId, enabled, interval);
      const res = await api.projects();
      const found = res.projects.find((p) => p.id === projectId);
      if (found) {
        setProject(found);
        setEnabled(found.monitoringEnabled ?? false);
        setIntervalVal(found.monitoringInterval ?? 60);
      }
    } catch (err) {
      setUpdateError((err as Error).message);
    } finally {
      setUpdating(false);
    }
  };

  const handleCheck = async () => {
    setChecking(true);
    setError(undefined);
    setMessage(undefined);
    try {
      const res = await api.monitorProject(projectId);
      if (res.status === "up-to-date") {
        setMessage("Repository is up-to-date. No changes detected.");
      } else if (res.status === "scan-queued") {
        setMessage(`New commit detected! Auto-scan queued: ${res.commitHash.slice(0, 7)}`);
        await onRefresh();
      } else if (res.status === "no-git-targets") {
        setError("This project has no Git repository targets to monitor.");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setChecking(false);
    }
  };

  const renderSettings = () => (
    <div style={{ background: "var(--raised)", border: "1px solid var(--edge)", padding: 20, marginBottom: 24 }}>
      <div className="label" style={{ marginBottom: 12 }}>Continuous Monitoring Settings</div>
      <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            id="mon-enabled"
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            style={{ width: 16, height: 16, cursor: "pointer" }}
          />
          <label htmlFor="mon-enabled" style={{ fontSize: 13, cursor: "pointer", userSelect: "none" }}>
            Enable Automatic Git Polling
          </label>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>Interval (minutes):</span>
          <input
            type="number"
            min={1}
            value={interval}
            onChange={(e) => setIntervalVal(Number.parseInt(e.target.value, 10) || 60)}
            style={{ width: 80, padding: "4px 8px", background: "var(--bg)", border: "1px solid var(--edge)", color: "var(--display)" }}
          />
        </div>

        <button
          className="btn"
          type="button"
          disabled={updating}
          onClick={handleSaveSettings}
          style={{ padding: "4px 12px", minWidth: "auto", fontSize: 12 }}
        >
          {updating ? "Saving..." : "Save Settings"}
        </button>

        {updateError && <span style={{ color: "var(--critical)", fontSize: 12 }}>{updateError}</span>}
      </div>

      {project && (
        <div style={{ display: "flex", gap: 24, marginTop: 14, fontSize: 12, color: "var(--muted)", borderTop: "1px solid var(--edge)", paddingTop: 10 }}>
          <div>
            Last Checked: <span style={{ color: "var(--display)" }}>{project.lastMonitoredAt ? new Date(project.lastMonitoredAt).toLocaleString() : "Never"}</span>
          </div>
          <div>
            Status: <span style={{ color: project.monitoringEnabled ? "var(--quantum)" : "var(--legacy)", fontWeight: "bold" }}>
              {project.monitoringEnabled ? "Active (Background Poller)" : "Disabled"}
            </span>
          </div>
        </div>
      )}
    </div>
  );

  const renderSyncBar = () => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, background: "var(--raised)", padding: "14px 20px", border: "1px solid var(--edge)" }}>
      <div>
        <span className="label" style={{ marginRight: 12 }}>Watchtower Status:</span>
        <span style={{ fontSize: 13, color: "var(--muted)" }}>Remote Git Polling Active</span>
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        {error && <span style={{ color: "var(--critical)", fontSize: 12 }}>{error}</span>}
        {message && <span style={{ color: "var(--quantum)", fontSize: 12 }}>{message}</span>}
        <button className="btn primary" type="button" disabled={checking} onClick={handleCheck} style={{ padding: "6px 12px", minWidth: "auto" }}>
          {checking ? "Checking..." : "Check for Changes"}
        </button>
      </div>
    </div>
  );

  const renderHistory = (historyList?: WatchtowerHistoryItem[]) => {
    if (!historyList || historyList.length === 0) return null;
    return (
      <div style={{ marginTop: 36 }}>
        <div className="label" style={{ marginBottom: 12 }}>Continuous Monitoring History</div>
        <table className="data">
          <thead>
            <tr>
              <th style={{ width: 120 }}>Scan ID</th>
              <th>Trigger/Source Target</th>
              <th style={{ width: 150 }}>Commit SHA</th>
              <th style={{ width: 150 }}>Started</th>
              <th style={{ width: 100 }}>Posture</th>
              <th style={{ width: 100 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {historyList.map((h) => {
              const gitTarget = (h.targets as Record<string, unknown>[]).find((t) => t.kind === "git-repository");
              const commitSha = gitTarget?.commitHash ? (gitTarget.commitHash as string).slice(0, 7) : "N/A";
              const commitMsg = (gitTarget?.commitMessage as string) || "";
              const targetName = (gitTarget?.name as string) || "Scan Target";
              return (
                <tr key={h.id}>
                  <td className="mono" style={{ fontSize: 12 }}>{h.id.slice(0, 12)}...</td>
                  <td>
                    <div className="title" style={{ fontSize: 13 }}>{targetName}</div>
                    {commitMsg && <div className="where">{commitMsg}</div>}
                  </td>
                  <td className="mono" style={{ fontSize: 12 }}>{commitSha}</td>
                  <td style={{ fontSize: 12, color: "var(--muted)" }}>{new Date(h.startedAt).toLocaleString()}</td>
                  <td className="mono" style={{ fontSize: 13, fontWeight: "bold" }}>
                    {h.postureScore !== null ? `${h.postureScore}/100` : "-"}
                  </td>
                  <td className="mono" style={{ fontSize: 11, color: h.status === "succeeded" ? "var(--quantum)" : "var(--legacy)" }}>
                    {h.status.toUpperCase()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  if (!diff) {
    return (
      <>
        {renderSyncBar()}
        {renderSettings()}
        <div className="label" style={{ padding: 20 }}>Comparing scans…</div>
      </>
    );
  }

  if (diff.status === "insufficient-history") {
    return (
      <>
        {renderSyncBar()}
        {renderSettings()}
        <Empty title="Insufficient Scan History">
          <p>Watchtower requires at least two successful scans for this project to calculate posture differentials.</p>
        </Empty>
        {renderHistory(diff.history)}
      </>
    );
  }

  const { scoreShift, previousScore, currentScore, introduced, resolved, persistent, history } = diff;

  let bannerStyle: React.CSSProperties = {
    padding: "16px 20px",
    marginBottom: 24,
    borderLeft: "4px solid var(--tick)",
    background: "var(--raised)",
  };
  let bannerTitle = "Posture Unchanged";
  let bannerDesc = `Overall posture score is ${currentScore}/100.`;

  if (scoreShift > 0) {
    bannerStyle = {
      padding: "16px 20px",
      marginBottom: 24,
      borderLeft: "4px solid var(--quantum)",
      background: "rgba(63, 208, 227, 0.1)",
      color: "var(--display)",
    };
    bannerTitle = `Posture Improved: +${scoreShift}`;
    bannerDesc = `Security rating progressed from ${previousScore} to ${currentScore} / 100.`;
  } else if (scoreShift < 0) {
    bannerStyle = {
      padding: "16px 20px",
      marginBottom: 24,
      borderLeft: "4px solid var(--critical)",
      background: "rgba(233, 85, 85, 0.1)",
      color: "var(--display)",
    };
    bannerTitle = `Posture Regressed: ${scoreShift}`;
    bannerDesc = `Security rating decreased from ${previousScore} to ${currentScore} / 100.`;
  }

  return (
    <>
      {renderSyncBar()}
      {renderSettings()}

      {scoreShift < 0 && introduced.length > 0 && (
        <div style={{ padding: "14px 20px", border: "1px solid var(--critical)", background: "rgba(233, 85, 85, 0.08)", borderRadius: 4, marginBottom: 24, display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ color: "var(--critical)", fontSize: 18, fontWeight: "bold" }}>⚠️ Regression Warning</span>
          <span style={{ color: "var(--display)", fontSize: 13 }}>
            The latest commit introduced <b>{introduced.length} new cryptographic risk(s)</b>. Posture score degraded by <b>{Math.abs(scoreShift)} points</b>.
          </span>
        </div>
      )}

      <div style={bannerStyle}>
        <h3 style={{ margin: "0 0 6px 0", fontSize: 16 }}>{bannerTitle}</h3>
        <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>{bannerDesc}</p>
      </div>

      <Readout
        items={[
          {
            label: "Introduced",
            value: introduced.length,
            sub: "new vulnerabilities",
            tone: introduced.length > 0 ? "var(--critical)" : undefined,
          },
          {
            label: "Resolved",
            value: resolved.length,
            sub: "removed vulnerabilities",
            tone: resolved.length > 0 ? "var(--quantum)" : undefined,
          },
          { label: "Persistent", value: persistent.length, sub: "monitored assets" },
          {
            label: "Severity Shift",
            value: persistent.filter((p) => p.severityChanged).length,
            sub: "assets changed risk level",
          },
        ]}
      />

      {introduced.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <div className="label" style={{ marginBottom: 12, color: "var(--critical)" }}>
            Introduced Cryptographic Assets
          </div>
          <table className="data">
            <thead>
              <tr>
                <th>Asset</th>
                <th style={{ width: 140 }}>Primitive</th>
                <th style={{ width: 120 }}>Component</th>
                <th style={{ width: 100 }}>Risk Score</th>
              </tr>
            </thead>
            <tbody>
              {introduced.map((f, i) => (
                <tr key={`${f.id}-${i}`}>
                  <td>
                    <div className="title" style={{ color: "var(--critical)" }}>{f.algorithm}</div>
                    <div className="where">{f.provenance.evidence[0]?.locator ?? "unknown location"}</div>
                  </td>
                  <td className="mono" style={{ fontSize: 12 }}>{f.primitive}</td>
                  <td className="mono" style={{ fontSize: 12 }}>{f.component}</td>
                  <td className="mono" style={{ fontSize: 13, color: "var(--critical)", fontWeight: "bold" }}>
                    {f.risk.score} ({f.risk.severity.toUpperCase()})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {resolved.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <div className="label" style={{ marginBottom: 12, color: "var(--quantum)" }}>
            Resolved Cryptographic Assets
          </div>
          <table className="data">
            <thead>
              <tr>
                <th>Asset</th>
                <th style={{ width: 140 }}>Primitive</th>
                <th style={{ width: 120 }}>Component</th>
                <th style={{ width: 100 }}>Former Risk</th>
              </tr>
            </thead>
            <tbody>
              {resolved.map((f, i) => (
                <tr key={`${f.id}-${i}`}>
                  <td>
                    <div className="title" style={{ color: "var(--quantum)" }}>{f.algorithm}</div>
                    <div className="where">{f.provenance.evidence[0]?.locator ?? "unknown location"}</div>
                  </td>
                  <td className="mono" style={{ fontSize: 12 }}>{f.primitive}</td>
                  <td className="mono" style={{ fontSize: 12 }}>{f.component}</td>
                  <td className="mono" style={{ fontSize: 13, color: "var(--muted)" }}>
                    {f.risk.score} ({f.risk.severity.toUpperCase()})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {persistent.filter((p) => p.scoreDelta !== 0 || p.severityChanged).length > 0 && (
        <div style={{ marginTop: 32 }}>
          <div className="label" style={{ marginBottom: 12 }}>
            Modified Risk Profiles
          </div>
          <table className="data">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Component</th>
                <th style={{ width: 200 }}>Severity Shift</th>
                <th style={{ width: 160 }}>Score Change</th>
              </tr>
            </thead>
            <tbody>
              {persistent
                .filter((p) => p.scoreDelta !== 0 || p.severityChanged)
                .map((p, i) => (
                  <tr key={`${p.finding.id}-${i}`}>
                    <td>
                      <div className="title">{p.finding.algorithm}</div>
                      <div className="where">{p.finding.provenance.evidence[0]?.locator ?? "unknown location"}</div>
                    </td>
                    <td className="mono" style={{ fontSize: 12 }}>{p.finding.component}</td>
                    <td className="mono" style={{ fontSize: 12 }}>
                      {p.severityChanged ? (
                        <>
                          <span style={{ color: "var(--muted)" }}>{p.previousSeverity}</span>
                          {" → "}
                          <span style={{ color: p.scoreDelta > 0 ? "var(--critical)" : "var(--quantum)" }}>
                            {p.currentSeverity}
                          </span>
                        </>
                      ) : (
                        <span style={{ color: "var(--muted)" }}>{p.currentSeverity}</span>
                      )}
                    </td>
                    <td className="mono" style={{ fontSize: 13, fontWeight: "bold" }}>
                      {p.previousScore} → {p.currentScore}{" "}
                      <span style={{ color: p.scoreDelta > 0 ? "var(--critical)" : "var(--quantum)" }}>
                        ({p.scoreDelta > 0 ? `+${p.scoreDelta}` : p.scoreDelta})
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {renderHistory(history)}
    </>
  );
}
