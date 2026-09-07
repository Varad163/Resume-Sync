import { useEffect, useState } from "react";
import type { Finding, ScanRecord } from "@ironbastion/core";
import { api, type Posture } from "../api.js";
import { FindingsTable, Spectrum } from "../components.js";

interface IssuesPageProps {
  scans: (ScanRecord & { posture?: Posture })[];
  onSelectScan?: (scanId: string) => void;
}

export function IssuesPage({ scans, onSelectScan }: IssuesPageProps) {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFinding, setSelectedFinding] = useState<string | undefined>();
  const [selectedScanId, setSelectedScanId] = useState<string>("");

  const latestScan = scans.find((s) => s.status === "succeeded") || scans[0];

  useEffect(() => {
    const scanToLoad = selectedScanId || latestScan?.id;
    if (!scanToLoad) {
      setLoading(false);
      return;
    }

    setLoading(true);
    api
      .findings(scanToLoad)
      .then(({ findings: loaded }) => {
        setFindings(loaded);
      })
      .catch((err) => {
        console.warn("Failed to load findings:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [selectedScanId, latestScan?.id]);

  const criticalCount = findings.filter((f) => f.risk.severity === "critical").length;
  const highCount = findings.filter((f) => f.risk.severity === "high").length;
  const mediumCount = findings.filter((f) => f.risk.severity === "medium").length;
  const lowCount = findings.filter((f) => f.risk.severity === "low").length;

  const currentScanId = selectedScanId || latestScan?.id;

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1 className="page-title">Security Issues</h1>
          <p className="page-subtitle">Track, filter, and remediate discovered cryptographic vulnerabilities and risks.</p>
        </div>

        {scans.length > 0 && (
          <div className="scan-selector-dropdown" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 12, color: "var(--dim)" }}>Scan:</label>
            <select
              className="select-input sm"
              value={currentScanId || ""}
              onChange={(e) => setSelectedScanId(e.target.value)}
            >
              {scans.map((scan) => (
                <option key={scan.id} value={scan.id}>
                  {scan.id} ({new Date(scan.startedAt).toLocaleDateString()}) - {scan.stats?.findingsConfirmed ?? 0} issues
                </option>
              ))}
            </select>
            {onSelectScan && currentScanId && (
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => onSelectScan(currentScanId)}
              >
                View Scan Details
              </button>
            )}
          </div>
        )}
      </header>

      {/* Summary KPI Pills */}
      <div className="issues-kpi-bar">
        <div className="kpi-card critical">
          <div className="kpi-label">Critical</div>
          <div className="kpi-value">{criticalCount}</div>
          <div className="kpi-sub">Quantum-broken algorithms</div>
        </div>
        <div className="kpi-card high">
          <div className="kpi-label">High</div>
          <div className="kpi-value">{highCount}</div>
          <div className="kpi-sub">Weakened algorithms</div>
        </div>
        <div className="kpi-card medium">
          <div className="kpi-label">Medium</div>
          <div className="kpi-value">{mediumCount}</div>
          <div className="kpi-sub">Deprecated key lengths</div>
        </div>
        <div className="kpi-card low">
          <div className="kpi-label">Low</div>
          <div className="kpi-value">{lowCount}</div>
          <div className="kpi-sub">Informational & safe</div>
        </div>
      </div>

      {findings.length > 0 && (
        <div className="spectrum-card-wrapper" style={{ marginBottom: 24 }}>
          <Spectrum findings={findings} onSelect={setSelectedFinding} />
        </div>
      )}

      {loading ? (
        <div className="loading-card">Loading security findings…</div>
      ) : findings.length === 0 ? (
        <div className="empty-card">
          <h3>No security issues found</h3>
          <p>Great news! No cryptographic vulnerabilities were detected in the selected scan.</p>
        </div>
      ) : (
        <div className="findings-table-card">
          <FindingsTable
            findings={findings}
            selected={selectedFinding}
            onSelect={setSelectedFinding}
          />
        </div>
      )}
    </div>
  );
}
