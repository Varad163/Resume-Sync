import { useState } from "react";
import type { ScanRecord } from "@ironbastion/core";
import type { Posture } from "../api.js";

interface ScansPageProps {
  scans: (ScanRecord & { posture?: Posture })[];
  onOpenAddRepo: () => void;
  onSelectScan: (scanId: string) => void;
}

export function ScansPage({ scans, onOpenAddRepo, onSelectScan }: ScansPageProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredScans = scans.filter((scan) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "completed") return scan.status === "succeeded";
    if (statusFilter === "running") return scan.status === "running" || scan.status === "queued";
    if (statusFilter === "failed") return scan.status === "failed";
    return true;
  });

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1 className="page-title">Security Scans</h1>
          <p className="page-subtitle">View history, execution traces, and real-time status of all security scans.</p>
        </div>
        <button type="button" className="btn primary" onClick={onOpenAddRepo}>
          + Run New Scan
        </button>
      </header>

      <div className="toolbar">
        <div className="filter-pills">
          <button
            type="button"
            className={`filter-pill ${statusFilter === "all" ? "active" : ""}`}
            onClick={() => setStatusFilter("all")}
          >
            All Scans ({scans.length})
          </button>
          <button
            type="button"
            className={`filter-pill ${statusFilter === "completed" ? "active" : ""}`}
            onClick={() => setStatusFilter("completed")}
          >
            Completed ({scans.filter((s) => s.status === "succeeded").length})
          </button>
          <button
            type="button"
            className={`filter-pill ${statusFilter === "running" ? "active" : ""}`}
            onClick={() => setStatusFilter("running")}
          >
            Running ({scans.filter((s) => s.status === "running" || s.status === "queued").length})
          </button>
          <button
            type="button"
            className={`filter-pill ${statusFilter === "failed" ? "active" : ""}`}
            onClick={() => setStatusFilter("failed")}
          >
            Failed ({scans.filter((s) => s.status === "failed").length})
          </button>
        </div>
      </div>

      {filteredScans.length === 0 ? (
        <div className="empty-card">
          <h3>No scans found</h3>
          <p>Run your first automated security scan to analyze cryptographic algorithms and dependencies.</p>
          <button type="button" className="btn primary" onClick={onOpenAddRepo}>
            + Run a Scan
          </button>
        </div>
      ) : (
        <div className="card-table-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Scan ID</th>
                <th>Target Repository</th>
                <th>Status</th>
                <th>Started At</th>
                <th>Posture</th>
                <th>Findings</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredScans.map((scan) => {
                const targetName =
                  (scan.targets?.[0] as { name?: string; remoteUrl?: string })?.name ||
                  (scan.targets?.[0] as { remoteUrl?: string })?.remoteUrl ||
                  "Local target";

                return (
                  <tr key={scan.id}>
                    <td>
                      <span className="mono-id">{scan.id}</span>
                    </td>
                    <td>
                      <div className="repo-cell">
                        <GithubIcon size={16} />
                        <span className="repo-name">{targetName}</span>
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={scan.status} />
                    </td>
                    <td className="text-muted">{new Date(scan.startedAt).toLocaleString()}</td>
                    <td>
                      {scan.posture ? (
                        <div className="posture-chip">
                          <span className="posture-score">{scan.posture.overall}</span>
                          <span className="posture-label">{scan.posture.severity}</span>
                        </div>
                      ) : (
                        <span className="text-dim">—</span>
                      )}
                    </td>
                    <td>
                      <div className="findings-count-badge">
                        {scan.stats?.findingsConfirmed ?? 0} confirmed
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn ghost sm"
                        onClick={() => onSelectScan(scan.id)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "succeeded" || status === "completed") {
    return <span className="status-pill status-completed">Completed</span>;
  }
  if (status === "running" || status === "queued") {
    return <span className="status-pill status-running">Running</span>;
  }
  if (status === "failed") {
    return <span className="status-pill status-failed">Failed</span>;
  }
  return <span className="status-pill status-pending">Pending</span>;
}

function GithubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}
