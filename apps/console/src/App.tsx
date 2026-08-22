/**
 * The console.
 *
 * Three views, because a scan produces three things a customer acts on: the
 * findings, the inventory, and the plan. Everything else is provenance, and it
 * sits next to the thing it explains rather than in a separate audit screen
 * nobody opens.
 */

import { useCallback, useEffect, useState } from "react";
import type { Finding, MigrationPlan } from "@ironbastion/core";
import type { CycloneDxBom } from "@ironbastion/cbom";
import { api, type AuditEntry, type Project, type ScanDetail } from "./api.js";
import { Empty, FindingsTable, PhaseTrail, Readout, Spectrum } from "./components.js";
import type { ScanRecord } from "@ironbastion/core";

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

type Tab = "findings" | "inventory" | "plan";

function ScanView({ id, onBack }: { id: string; onBack: () => void }) {
  const [detail, setDetail] = useState<ScanDetail>();
  const [findings, setFindings] = useState<Finding[]>([]);
  const [cbom, setCbom] = useState<CycloneDxBom>();
  const [plan, setPlan] = useState<MigrationPlan>();
  const [tab, setTab] = useState<Tab>("findings");
  const [selected, setSelected] = useState<string>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        const loaded = await api.scan(id);
        if (!live) return;
        setDetail(loaded);
        if (loaded.scan.status === "succeeded") {
          const [f, b, p] = await Promise.all([api.findings(id), api.cbom(id), api.plan(id)]);
          if (!live) return;
          setFindings(f.findings);
          setCbom(b);
          setPlan(p.plan);
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
        {(["findings", "inventory", "plan"] as Tab[]).map((name) => (
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

      {tab === "inventory" ? <Inventory cbom={cbom} notes={detail.notes} /> : null}
      {tab === "plan" ? <Plan plan={plan} /> : null}
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

function Plan({ plan }: { plan?: MigrationPlan }) {
  if (!plan) return <Empty title="No plan yet"><p>The migration plan is produced after findings are scored.</p></Empty>;

  return (
    <>
      <p style={{ color: "var(--body)", fontSize: 14, maxWidth: "78ch", marginBottom: 24 }}>
        {plan.summary}
      </p>

      {plan.waves.map((wave) => (
        <section className="wave" key={wave.id}>
          <header>
            <h3>{wave.name}</h3>
            <p className="why">{wave.rationale}</p>
          </header>
          <table className="data">
            <thead>
              <tr>
                <th style={{ width: 50 }}>Size</th>
                <th>Component</th>
                <th style={{ width: 230 }}>Change</th>
                <th style={{ width: 150 }}>Approach</th>
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
                </tr>
              ))}
            </tbody>
          </table>
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
