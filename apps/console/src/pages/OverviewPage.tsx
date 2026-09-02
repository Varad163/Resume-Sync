import { useCallback, useEffect, useState } from "react";
import type { ScanRecord } from "@ironbastion/core";
import { api, type Project } from "../api.js";
import { Empty, Readout } from "../components.js";

const SEVERITY_TONE: Record<string, string> = {
  critical: "var(--critical)",
  high: "var(--legacy)",
  medium: "var(--legacy)",
  low: "var(--quantum)",
  informational: "var(--dim)",
};

export function Overview({ onOpen }: { onOpen: (id: string) => void }) {
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
              <th style={{ width: 120 }}>ID</th>
              <th>Phase</th>
              <th style={{ width: 90 }}>Posture</th>
              <th style={{ width: 110 }}>Confirmed</th>
              <th style={{ width: 110 }}>Review</th>
              <th style={{ width: 130 }}>Started</th>
            </tr>
          </thead>
          <tbody>
            {scans.map((scan) => (
              <tr key={scan.id} className="row" onClick={() => onOpen(scan.id)}>
                <td className="mono" style={{ color: "var(--quantum)" }}>
                  {scan.id}
                </td>
                <td>
                  {scan.phase}
                  {scan.status === "failed" ? (
                    <span style={{ color: "var(--critical)", marginLeft: 8 }}>failed</span>
                  ) : null}
                </td>
                <td className="mono">
                  {scan.posture ? (
                    <span style={{ color: SEVERITY_TONE[scan.posture.severity] }}>
                      {scan.posture.overall}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="mono">{scan.stats.findingsConfirmed}</td>
                <td className="mono">{scan.stats.needsHuman}</td>
                <td className="mono" style={{ color: "var(--muted)", fontSize: 12 }}>
                  {new Date(scan.startedAt).toLocaleTimeString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
