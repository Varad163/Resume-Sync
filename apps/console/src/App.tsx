/**
 * The console.
 *
 * Three views, because a scan produces three things a customer acts on: the
 * findings, the inventory, and the plan. Everything else is provenance, and it
 * sits next to the thing it explains rather than in a separate audit screen
 * nobody opens.
 */

import { useCallback, useEffect, useState } from "react";
import type { Finding, MigrationPlan, PqcCertificate, MigrationAction, ForgeVerificationReport } from "@ironbastion/core";
import type { CycloneDxBom } from "@ironbastion/cbom";
import {
  api,
  type AgentTrace,
  type AuditEntry,
  type CollectorRun,
  type Project,
  type ScanDetail,
  type WatchtowerResponse,
  type WatchtowerHistoryItem,
} from "./api.js";
import { AgentsView } from "./agents.js";
import { Empty, FindingsTable, PhaseTrail, Readout, Spectrum } from "./components.js";
import type { ScanRecord, ScanTarget } from "@ironbastion/core";

type View = { name: "overview" } | { name: "scan"; id: string } | { name: "audit" };

const SEVERITY_TONE: Record<string, string> = {
  critical: "var(--critical)",
  high: "var(--legacy)",
  medium: "var(--legacy)",
  low: "var(--quantum)",
  informational: "var(--dim)",
};

export default function App() {
  const [view, setView] = useState<View>({ name: "overview" });

  return (
    <div className="shell">
      <aside className="rail">
        <div className="wordmark">
          <Mark />
          <b>
            Iron<span>bastion</span>
          </b>
        </div>
        <nav>
          <button
            type="button"
            className="navitem"
            aria-current={view.name === "overview" ? "page" : undefined}
            onClick={() => setView({ name: "overview" })}
          >
            Scans
          </button>
          <button
            type="button"
            className="navitem"
            aria-current={view.name === "audit" ? "page" : undefined}
            onClick={() => setView({ name: "audit" })}
          >
            Activity
          </button>
        </nav>
        <div className="foot">
          <div className="label">Console</div>
          <div className="mono" style={{ fontSize: 11, color: "var(--tick)", marginTop: 6 }}>
            v0.1.0
          </div>
        </div>
      </aside>

      <main className="main">
        {view.name === "overview" ? (
          <Overview onOpen={(id) => setView({ name: "scan", id })} />
        ) : view.name === "scan" ? (
          <ScanView id={view.id} onBack={() => setView({ name: "overview" })} />
        ) : (
          <Activity />
        )}
      </main>
    </div>
  );
}

function Mark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 3.2 L18.8 7 L18.8 13 L12 20.6 L5.2 13 L5.2 7 Z"
        fill="none"
        stroke="var(--quantum)"
        strokeWidth="1.6"
      />
    </svg>
  );
}

// ------------------------------------------------------------------ overview

function Overview({ onOpen }: { onOpen: (id: string) => void }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [scans, setScans] = useState<(ScanRecord & { posture?: { overall: number; severity: string } })[]>([]);
  const [error, setError] = useState<string>();
  const [starting, setStarting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [{ projects: loadedProjects }, { scans: loadedScans }] = await Promise.all([
        api.projects(),
        api.scans(),
      ]);
      setProjects(loadedProjects);
      setScans(loadedScans);
      setError(undefined);
    } catch (cause) {
      setError((cause as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
    // A running scan finishes in seconds to minutes; poll while any is live.
    const timer = setInterval(() => void load(), 3000);
    return () => clearInterval(timer);
  }, [load]);

  const runScan = async () => {
    const project = projects[0];
    if (!project) return;
    setStarting(true);
    try {
      const { scan } = await api.startScan(project.id);
      await load();
      onOpen(scan.id);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setStarting(false);
    }
  };

  const latest = scans.find((scan) => scan.status === "succeeded");

  return (
    <>
      <header className="pagehead">
        <div>
          <div className="label">Quantum security posture</div>
          <h1>{projects[0]?.name ?? "No project"}</h1>
          <p>
            {projects[0]?.description ??
              "Connect a repository to start discovering the cryptography your estate depends on."}
          </p>
        </div>
        <button className="btn primary" type="button" onClick={runScan} disabled={starting || !projects[0]}>
          {starting ? "Starting…" : "Run scan"}
        </button>
      </header>

      {error ? (
        <div className="banner">
          <b>Could not load</b>
          {error}
        </div>
      ) : null}

      {latest?.posture ? (
        <Readout
          items={[
            {
              label: "Posture",
              value: `${latest.posture.overall}`,
              sub: latest.posture.severity.toUpperCase(),
              tone: SEVERITY_TONE[latest.posture.severity],
            },
            { label: "Confirmed", value: latest.stats.findingsConfirmed, sub: "findings" },
            { label: "Awaiting review", value: latest.stats.needsHuman, sub: "low confidence" },
            { label: "Files scanned", value: latest.stats.filesScanned, sub: "in last scan" },
          ]}
        />
      ) : null}

      <h2 className="label" style={{ marginBottom: 12 }}>
        Scans
      </h2>

      {scans.length === 0 ? (
        <Empty title="No scans yet">
          <p>
            A scan reads your repositories and endpoints, works out what cryptography they depend
            on, and tells you what breaks when the maths does.
          </p>
          <button className="btn primary" type="button" onClick={runScan} disabled={!projects[0]}>
            Run the first scan
          </button>
        </Empty>
      ) : (
        <table className="data">
          <thead>
            <tr>
              <th style={{ width: 66 }}>Posture</th>
              <th>Scan</th>
              <th style={{ width: 240 }}>Progress</th>
              <th style={{ width: 130 }}>Findings</th>
            </tr>
          </thead>
          <tbody>
            {scans.map((scan) => (
              <tr key={scan.id} className="row" onClick={() => onOpen(scan.id)}>
                <td className={`score sev-${scan.posture?.severity ?? "informational"}`}>
                  {scan.posture?.overall ?? "—"}
                </td>
                <td>
                  <div className="title mono" style={{ fontSize: 12 }}>
                    {scan.id}
                  </div>
                  <div className="where">
                    {new Date(scan.startedAt).toLocaleString()} ·{" "}
                    {scan.targets.length} target{scan.targets.length === 1 ? "" : "s"}
                    {scan.error ? ` · ${scan.error}` : ""}
                  </div>
                </td>
                <td>
                  <PhaseTrail phase={scan.phase} status={scan.status} />
                </td>
                <td className="mono" style={{ fontSize: 13 }}>
                  {scan.status === "succeeded" ? scan.stats.findingsConfirmed : scan.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

// ----------------------------------------------------------------- scan view

type Tab = "findings" | "agents" | "inventory" | "plan" | "watchtower" | "forge";

function ScanView({ id, onBack }: { id: string; onBack: () => void }) {
  const [detail, setDetail] = useState<ScanDetail>();
  const [findings, setFindings] = useState<Finding[]>([]);
  const [cbom, setCbom] = useState<CycloneDxBom>();
  const [plan, setPlan] = useState<MigrationPlan>();
  const [customPlan, setCustomPlan] = useState<MigrationPlan | null>(null);
  const [traces, setTraces] = useState<AgentTrace[]>([]);
  const [collectorRuns, setCollectorRuns] = useState<CollectorRun[]>([]);
  const [tab, setTab] = useState<Tab>("findings");
  const [selected, setSelected] = useState<string>();
  const [error, setError] = useState<string>();
  const [certifying, setCertifying] = useState(false);
  const [watchtowerDiff, setWatchtowerDiff] = useState<WatchtowerResponse | null>(null);
  const [forgeReport, setForgeReport] = useState<ForgeVerificationReport | null>(null);

  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        const loaded = await api.scan(id);
        if (!live) return;
        setDetail(loaded);
        if (loaded.scan.status === "succeeded") {
          const [f, b, p, a, w, fo] = await Promise.all([
            api.findings(id),
            api.cbom(id),
            api.plan(id),
            api.agents(id),
            api.watchtower(loaded.scan.projectId).catch(() => null),
            api.forge(id).catch(() => null),
          ]);
          if (!live) return;
          setFindings(f.findings);
          setCbom(b);
          setPlan(p.plan);
          setCustomPlan(p.customPlan);
          setTraces(a.traces);
          setCollectorRuns(a.collectorRuns);
          setWatchtowerDiff(w as WatchtowerResponse | null);
          setForgeReport(fo?.report ?? null);
        }
      } catch (cause) {
        if (live) setError((cause as Error).message);
      }
    };
    void load();
    const timer = setInterval(() => void load(), 2500);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [id]);

  if (error) {
    return (
      <div className="banner">
        <b>Could not load this scan</b>
        {error}
      </div>
    );
  }
  if (!detail) return <div className="label">Loading…</div>;

  const { scan, posture } = detail;
  const running = scan.status === "running" || scan.status === "queued";

  return (
    <>
      <header className="pagehead">
        <div>
          <button className="label" type="button" onClick={onBack} style={{ background: "none", border: 0, cursor: "pointer", padding: 0 }}>
            ← All scans
          </button>
          <h1 className="mono" style={{ fontSize: 22 }}>
            {scan.id}
          </h1>
          <p>
            Started {new Date(scan.startedAt).toLocaleString()}
            {scan.finishedAt ? `, finished ${new Date(scan.finishedAt).toLocaleTimeString()}` : ""}
          </p>
        </div>
        {scan.status === "succeeded" ? (
          <div style={{ display: "flex", gap: 8 }}>
            <a className="btn ghost" href={api.reportUrl(scan.id)} target="_blank" rel="noreferrer">
              Report
            </a>
            <a className="btn" href={`/v1/scans/${scan.id}/cbom`} target="_blank" rel="noreferrer">
              Download CBOM
            </a>
            <button className="btn primary" type="button" onClick={() => setCertifying(true)}>
              Certify Scan
            </button>
          </div>
        ) : null}
      </header>

      {running ? (
        <div className="banner">
          <b>Scan in progress</b>
          <PhaseTrail phase={scan.phase} status={scan.status} />
        </div>
      ) : null}

      {scan.status === "failed" ? (
        <div className="banner">
          <b>Scan failed</b>
          {scan.error ?? "No reason was recorded."}
        </div>
      ) : null}

      {posture ? (
        <Readout
          items={[
            {
              label: "Posture",
              value: posture.overall,
              sub: posture.severity.toUpperCase(),
              tone: SEVERITY_TONE[posture.severity],
            },
            { label: "Confirmed", value: scan.stats.findingsConfirmed, sub: "published findings" },
            { label: "Awaiting review", value: scan.stats.needsHuman, sub: "below confidence bar" },
            { label: "Crypto assets", value: cbom?.components.length ?? 0, sub: "in the CBOM" },
            {
              label: "Effort",
              value: plan?.totalEffortDays ?? 0,
              sub: "engineer-days planned",
            },
          ]}
        />
      ) : null}

      {findings.length > 0 ? <Spectrum findings={findings} onSelect={setSelected} /> : null}

      {detail.inventory?.summary ? (
        <p style={{ color: "var(--body)", fontSize: 14, maxWidth: "78ch", marginBottom: 26 }}>
          {detail.inventory.summary}
        </p>
      ) : null}

      <div className="tabs">
        {(["findings", "agents", "inventory", "plan", "watchtower"] as Tab[]).map((name) => (
          <button
            key={name}
            type="button"
            aria-selected={tab === name}
            role="tab"
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </div>

      {tab === "findings" ? (
        findings.length === 0 ? (
          <Empty title={running ? "Still scanning" : "No findings"}>
            <p>
              {running
                ? "Findings appear here as soon as the campaign finishes adjudicating them."
                : "Nothing quantum-vulnerable was confirmed in the targets scanned."}
            </p>
          </Empty>
        ) : (
          <FindingsTable findings={findings} selected={selected} onSelect={setSelected} />
        )
      ) : null}

      {tab === "agents" ? <AgentsView traces={traces} collectorRuns={collectorRuns} /> : null}
      {tab === "inventory" ? <Inventory cbom={cbom} notes={detail.notes} /> : null}
      {tab === "plan" ? (
        <Plan
          scanId={scan.id}
          plan={plan}
          customPlan={customPlan}
          onPlanChange={setCustomPlan}
        />
      ) : null}
      {tab === "watchtower" && detail ? (
        <Watchtower
          projectId={detail.scan.projectId}
          diff={watchtowerDiff}
          onRefresh={async () => {
            const w = await api.watchtower(detail.scan.projectId).catch(() => null);
            setWatchtowerDiff(w as WatchtowerResponse | null);
          }}
        />
      ) : null}
      {tab === "forge" && detail ? (
        <Forge
          scanId={scan.id}
          targets={scan.targets}
          report={forgeReport}
          onReportChange={setForgeReport}
        />
      ) : null}

      {certifying && <CertifyModal scanId={scan.id} onClose={() => setCertifying(false)} />}
    </>
  );
}

function Inventory({ cbom, notes }: { cbom?: CycloneDxBom; notes: string[] }) {
  if (!cbom) return <Empty title="No inventory yet"><p>The CBOM is assembled when the scan completes.</p></Empty>;

  return (
    <>
      <table className="data">
        <thead>
          <tr>
            <th>Asset</th>
            <th style={{ width: 120 }}>Primitive</th>
            <th style={{ width: 90 }}>PQ level</th>
            <th style={{ width: 90 }}>Uses</th>
            <th style={{ width: 200 }}>Components</th>
          </tr>
        </thead>
        <tbody>
          {cbom.components.map((component) => {
            const properties = Object.fromEntries(
              (component.properties ?? []).map((p) => [p.name, p.value]),
            );
            const level = component.cryptoProperties.algorithmProperties?.nistQuantumSecurityLevel ?? 0;
            return (
              <tr key={component["bom-ref"]}>
                <td>
                  <div className="title">{component.name}</div>
                  <div className="where">{component["bom-ref"]}</div>
                </td>
                <td className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
                  {component.cryptoProperties.algorithmProperties?.primitive ??
                    component.cryptoProperties.assetType}
                </td>
                <td
                  className="mono"
                  style={{ fontSize: 13, color: level === 0 ? "var(--critical)" : "var(--quantum)" }}
                >
                  {level === 0 ? "none" : level}
                </td>
                <td className="mono" style={{ fontSize: 13 }}>
                  {properties["ironbastion:occurrences"] ?? "—"}
                </td>
                <td className="where" style={{ marginTop: 0 }}>
                  {properties["ironbastion:components"] ?? "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {notes.length > 0 ? (
        <div style={{ marginTop: 28 }}>
          <div className="label" style={{ marginBottom: 10 }}>
            Scan notes
          </div>
          <ul style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.7, paddingLeft: 18 }}>
            {notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}

const EFFORT_DAYS = { S: 2, M: 8, L: 25, XL: 60 };

function moveMigrationAction(
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
  const totalEffortDays = allActions.reduce((sum, a) => sum + EFFORT_DAYS[a.effort as keyof typeof EFFORT_DAYS], 0);

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

function Plan({
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
              Wave Effort: {wave.actions.reduce((sum, a) => sum + EFFORT_DAYS[a.effort], 0)} days
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

// ------------------------------------------------------------------ activity

function Activity() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [error, setError] = useState<string>();

  useEffect(() => {
    void api
      .audit()
      .then(({ entries: loaded }) => setEntries(loaded))
      .catch((cause: Error) => setError(cause.message));
  }, []);

  return (
    <>
      <header className="pagehead">
        <div>
          <div className="label">Audit</div>
          <h1>Activity</h1>
          <p>Every scan, project change and completion, with who did it and when.</p>
        </div>
      </header>

      {error ? (
        <div className="banner">
          <b>Could not load activity</b>
          {error}
        </div>
      ) : null}

      {entries.length === 0 ? (
        <Empty title="Nothing recorded yet">
          <p>Activity appears here as soon as someone creates a project or runs a scan.</p>
        </Empty>
      ) : (
        <table className="data">
          <thead>
            <tr>
              <th style={{ width: 190 }}>When</th>
              <th style={{ width: 160 }}>Action</th>
              <th style={{ width: 220 }}>Actor</th>
              <th>Subject</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => (
              <tr key={`${entry.at}-${index}`}>
                <td className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
                  {new Date(entry.at).toLocaleString()}
                </td>
                <td className="mono" style={{ fontSize: 12, color: "var(--quantum)" }}>
                  {entry.action}
                </td>
                <td className="mono" style={{ fontSize: 12 }}>
                  {entry.actor}
                </td>
                <td className="mono" style={{ fontSize: 11, color: "var(--dim)" }}>
                  {entry.subject}
                  {Object.keys(entry.detail ?? {}).length > 0
                    ? ` · ${JSON.stringify(entry.detail)}`
                    : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

function Watchtower({
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
        <div className="label" style={{ padding: 20 }}>Comparing scans…</div>
      </>
    );
  }

  if (diff.status === "insufficient-history") {
    return (
      <>
        {renderSyncBar()}
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

interface CertifyModalProps {
  scanId: string;
  onClose: () => void;
}

function CertifyModal({ scanId, onClose }: CertifyModalProps) {
  const [cert, setCert] = useState<PqcCertificate | null>(null);
  const [pubKey, setPubKey] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([api.certificate(scanId), api.publicKey()])
      .then(([loadedCert, loadedKey]) => {
        setCert(loadedCert);
        setPubKey(loadedKey.publicKey);
      })
      .catch((err) => {
        setError((err as Error).message);
      });
  }, [scanId]);

  const downloadJson = () => {
    if (!cert) return;
    const blob = new Blob([JSON.stringify(cert, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pqc-certificate-${scanId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const copyText = () => {
    if (!cert) return;
    void navigator.clipboard.writeText(JSON.stringify(cert, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-window" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Cryptographic Posture Certificate</h2>
          <button className="btn ghost" type="button" onClick={onClose} style={{ minWidth: "auto", padding: "6px 12px" }}>
            ✕
          </button>
        </div>

        {error && <div className="banner"><b>Error generating certificate:</b> {error}</div>}
        
        {!error && !cert && <div className="label" style={{ padding: 20 }}>Generating cryptographic signature…</div>}

        {cert && (
          <>
            <div className="cert-section">
              <h3>Post-Quantum Readiness Assessment</h3>
              <div className="cert-row">
                <div className="lbl">Scan Campaign</div>
                <div className="val">{cert.scanId}</div>
              </div>
              <div className="cert-row">
                <div className="lbl">Project Name</div>
                <div className="val">{cert.project.name}</div>
              </div>
              <div className="cert-row">
                <div className="lbl">Certified At</div>
                <div className="val">{new Date(cert.certifiedAt).toLocaleString()}</div>
              </div>
              <div className="cert-row">
                <div className="lbl">CBOM Hash (SHA-256)</div>
                <div className="val">{cert.cbomHash.substring(0, 16)}...{cert.cbomHash.substring(48)}</div>
              </div>
              <div className="cert-row">
                <div className="lbl">Confirmed Crypto Assets</div>
                <div className="val">{cert.findingsConfirmed} findings</div>
              </div>
              <div className="cert-row accent">
                <div className="lbl" style={{ color: "var(--display)" }}>Overall Posture Score</div>
                <div className="val" style={{ color: cert.posture.overall >= 80 ? "var(--quantum)" : "var(--legacy)", fontWeight: "bold" }}>
                  {cert.posture.overall} / 100
                </div>
              </div>
            </div>

            <div className="cert-section">
              <h3>RSA Signature Verification</h3>
              <div className="cert-row" style={{ flexDirection: "column" }}>
                <div className="lbl">Public Key Verification Block:</div>
                <div className="key-box">{pubKey}</div>
              </div>
              <div className="cert-row" style={{ flexDirection: "column", marginTop: 14 }}>
                <div className="lbl">Cryptographic Signature payload:</div>
                <div className="key-box" style={{ whiteSpace: "normal", wordBreak: "break-all" }}>{cert.signature}</div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button className="btn ghost" type="button" onClick={copyText}>
                {copied ? "Copied!" : "Copy JSON"}
              </button>
              <button className="btn primary" type="button" onClick={downloadJson}>
                Download JSON
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface ForgeProps {
  scanId: string;
  targets: readonly ScanTarget[];
  report: ForgeVerificationReport | null;
  onReportChange: (report: ForgeVerificationReport) => void;
}

function Forge({ scanId, targets, report, onReportChange }: ForgeProps) {
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string>();

  const tlsTargets = (targets || []).filter((t: ScanTarget) => t.kind === "tls-endpoint");

  const handleVerify = async () => {
    setVerifying(true);
    setError(undefined);
    try {
      const res = await api.checkForge(scanId);
      onReportChange(res.report);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setVerifying(false);
    }
  };

  if (tlsTargets.length === 0) {
    return (
      <Empty title="Static Targets Only">
        <p>FORGE active handshake validation is designed for remote network TLS/PQC endpoints.</p>
        <p style={{ marginTop: 8, fontSize: 13, color: "var(--muted)" }}>
          No network-accessible targets are configured for this project.
        </p>
      </Empty>
    );
  }

  const firstTarget = tlsTargets[0]!;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, background: "var(--raised)", padding: "14px 20px", border: "1px solid var(--edge)" }}>
        <div>
          <span className="label" style={{ marginRight: 12 }}>Active Probing:</span>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>
            Target: {firstTarget.host}:{firstTarget.port || 443}
          </span>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {error && <span style={{ color: "var(--critical)", fontSize: 12 }}>{error}</span>}
          <button
            className="btn primary"
            type="button"
            disabled={verifying}
            onClick={handleVerify}
            style={{ padding: "6px 12px", minWidth: "auto" }}
          >
            {verifying ? "Probing..." : report ? "Re-Run Verification" : "Trigger Validation"}
          </button>
        </div>
      </div>

      {!report && !verifying && (
        <Empty title="Verification Pending">
          <p>Handshake and implementation checks have not been executed for this endpoint yet.</p>
          <button
            className="btn primary"
            type="button"
            onClick={handleVerify}
            style={{ marginTop: 16 }}
          >
            Run Cryptographic Handshake Probe
          </button>
        </Empty>
      )}

      {verifying && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 40, background: "var(--raised)", border: "1px solid var(--edge)" }}>
          <div className="label" style={{ animation: "pulse 1.5s infinite" }}>Executing dynamic handshake tests...</div>
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 12 }}>Offering PQ hybrids, testing cipher downgrade, and verifying parameter curves.</p>
        </div>
      )}

      {report && !verifying && (
        <>
          {report.overallStatus === "verified" && (
            <div style={{ padding: "16px 20px", marginBottom: 24, borderLeft: "4px solid var(--quantum)", background: "rgba(63, 208, 227, 0.08)" }}>
              <h3 style={{ margin: "0 0 4px 0", fontSize: 16, color: "var(--quantum)" }}>Validation Passed</h3>
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>All standard handshakes, negative curve injections, and parameter checks completed successfully.</p>
            </div>
          )}
          {report.overallStatus === "insecure" && (
            <div style={{ padding: "16px 20px", marginBottom: 24, borderLeft: "4px solid var(--legacy)", background: "rgba(233, 142, 85, 0.08)" }}>
              <h3 style={{ margin: "0 0 4px 0", fontSize: 16, color: "var(--legacy)" }}>Insecure Configuration</h3>
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>The server operates correctly, but supports legacy curves or protocol fallbacks vulnerable to downgrade attacks.</p>
            </div>
          )}
          {report.overallStatus === "broken" && (
            <div style={{ padding: "16px 20px", marginBottom: 24, borderLeft: "4px solid var(--critical)", background: "rgba(233, 85, 85, 0.08)" }}>
              <h3 style={{ margin: "0 0 4px 0", fontSize: 16, color: "var(--critical)" }}>Security Defect Detected</h3>
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>One or more critical validation tests (such as invalid key exchange parameter rejection) failed.</p>
            </div>
          )}
          {report.overallStatus === "failed" && (
            <div style={{ padding: "16px 20px", marginBottom: 24, borderLeft: "4px solid var(--dim)", background: "var(--raised)" }}>
              <h3 style={{ margin: "0 0 4px 0", fontSize: 16, color: "var(--body)" }}>Connection Refused</h3>
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>Unable to establish initial TLS connection or socket handshake timed out.</p>
            </div>
          )}

          <div style={{ marginTop: 24 }}>
            <div className="label" style={{ marginBottom: 12 }}>Handshake & Implementation Checks</div>
            <table className="data">
              <thead>
                <tr>
                  <th>Verification Test</th>
                  <th style={{ width: 140 }}>Target Type</th>
                  <th style={{ width: 140 }}>Severity</th>
                  <th style={{ width: 120 }}>Result</th>
                </tr>
              </thead>
              <tbody>
                {report.checks.map((check) => (
                  <tr key={check.id}>
                    <td>
                      <div className="title">{check.name}</div>
                      <div className="where">{check.description}</div>
                      {check.logs && check.logs.length > 0 && (
                        <div style={{ marginTop: 6, fontSize: 12, fontFamily: "monospace", color: check.status === "pass" ? "var(--quantum)" : "var(--critical)" }}>
                          {check.logs.join(" | ")}
                        </div>
                      )}
                    </td>
                    <td className="mono" style={{ fontSize: 12 }}>active</td>
                    <td className="mono" style={{ fontSize: 12, color: check.status === "fail" ? "var(--critical)" : "var(--muted)" }}>
                      {check.severity.toUpperCase()}
                    </td>
                    <td className="mono" style={{ fontSize: 12, fontWeight: "bold", color: check.status === "pass" ? "var(--quantum)" : "var(--critical)" }}>
                      {check.status.toUpperCase()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {report.traces && report.traces.length > 0 && (
            <div style={{ marginTop: 36 }}>
              <div className="label" style={{ marginBottom: 12 }}>Handshake Protocol Execution Trace</div>
              <div style={{ background: "var(--raised)", padding: 20, fontFamily: "monospace", fontSize: 13, border: "1px solid var(--edge)", maxHeight: 300, overflowY: "auto" }}>
                {report.traces.map((step, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 16, marginBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.03)", paddingBottom: 6 }}>
                    <span style={{ color: "var(--muted)", width: 90 }}>{new Date(step.timestamp).toLocaleTimeString()}</span>
                    <span style={{
                      color: step.status === "error" ? "var(--critical)" : step.status === "warning" ? "var(--legacy)" : "var(--quantum)",
                      width: 120,
                      fontWeight: "bold"
                    }}>
                      [{step.name.toUpperCase()}]
                    </span>
                    <span style={{ color: "var(--display)" }}>{step.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

