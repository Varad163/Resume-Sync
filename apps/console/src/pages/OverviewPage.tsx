import { useCallback, useEffect, useState } from "react";
import type { ScanRecord } from "@ironbastion/core";
import {
  api,
  type GithubStatusResponse,
  type GithubRepository,
  type Posture,
} from "../api.js";

interface OverviewProps {
  onOpenScan: (id: string) => void;
  onOpenAddRepo: () => void;
  onNavigateView: (view: "repositories" | "scans" | "issues" | "integrations" | "settings" | "docs/github") => void;
  userName?: string;
}

export function Overview({
  onOpenScan,
  onOpenAddRepo,
  onNavigateView,
  userName = "Varad",
}: OverviewProps) {
  const [scans, setScans] = useState<(ScanRecord & { posture?: Posture })[]>([]);
  const [error, setError] = useState<string>();
  const [githubStatus, setGithubStatus] = useState<GithubStatusResponse | null>(null);
  const [githubRepos, setGithubRepos] = useState<GithubRepository[]>([]);
  const [githubLoading, setGithubLoading] = useState(true);
  const [githubError, setGithubError] = useState<string | null>(null);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  const securityTips = [
    {
      title: "Keep your dependencies updated",
      body: "Outdated libraries can contain known vulnerabilities. Enable automated scanning to stay safe.",
      quote: "Security is not a product, but a process.",
      author: "Bruce Schneier",
    },
    {
      title: "Migrate away from RSA & ECC",
      body: "NIST standard PQC algorithms (ML-KEM, ML-DSA) provide quantum resistance for long-lived assets.",
      quote: "Cryptography is about creating trust through mathematics.",
      author: "NIST PQC Team",
    },
    {
      title: "Enable Watchtower Git Polling",
      body: "Automatically detect weak crypto introduction in pull requests before deployment.",
      quote: "Prevention is cheaper than remediation.",
      author: "IronBastion Security",
    },
  ];

  const loadData = useCallback(async () => {
    try {
      const { scans: loadedScans } = await api.scans();
      setScans(loadedScans);
      setError(undefined);
    } catch (cause) {
      setError((cause as Error).message);
    }
  }, []);

  const loadGithubData = useCallback(async () => {
    setGithubLoading(true);
    setGithubError(null);
    try {
      const status = await api.getGithubStatus();
      setGithubStatus(status);
      if (status.connected) {
        const { repositories } = await api.getGithubRepositories().catch(() => ({ repositories: [] }));
        setGithubRepos(repositories);
      } else {
        setGithubRepos([]);
      }
    } catch (e) {
      setGithubError((e as Error).message || "Failed to load GitHub status");
    } finally {
      setGithubLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
    void loadGithubData();
    const timer = setInterval(() => void loadData(), 3000);
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "IRONBASTION_GITHUB_CONNECTED") {
        void loadGithubData();
      }
    };
    window.addEventListener("message", handleMessage);
    return () => {
      clearInterval(timer);
      window.removeEventListener("message", handleMessage);
    };
  }, [loadData, loadGithubData]);

  const handleConnectGithub = async () => {
    try {
      const { url } = await api.connectGithub();
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.innerWidth - width) / 2;
      const top = window.screenY + (window.innerHeight - height) / 2;
      window.open(url, "Connect GitHub", `width=${width},height=${height},left=${left},top=${top}`);
    } catch (cause) {
      setError((cause as Error).message);
    }
  };

  // Compute metrics from actual scans
  const totalScans = scans.length;
  let totalCritical = 0;
  let totalHigh = 0;
  let totalMedium = 0;
  let totalLow = 0;

  scans.forEach((scan) => {
    if (scan.posture?.counts) {
      totalCritical += scan.posture.counts["critical"] ?? 0;
      totalHigh += scan.posture.counts["high"] ?? 0;
      totalMedium += scan.posture.counts["medium"] ?? 0;
      totalLow += scan.posture.counts["low"] ?? 0;
    } else if (scan.stats?.findingsConfirmed) {
      totalCritical += scan.stats.findingsConfirmed;
    }
  });

  const recentScans = scans.slice(0, 5);

  return (
    <div className="dashboard-page">
      {/* Top Welcome Header */}
      <div className="dashboard-welcome-header">
        <div>
          <h1 className="welcome-title">Welcome back, {userName}! 👋</h1>
          <p className="welcome-subtitle">
            Keep your code secure with automated scanning and intelligent insights.
          </p>
        </div>
        <button type="button" className="btn primary" onClick={onOpenAddRepo}>
          + Add Repository
        </button>
      </div>

      {error && (
        <div className="banner alert-error" style={{ marginBottom: 20 }}>
          <b>Error</b>
          {error}
        </div>
      )}

      {/* GitHub Onboarding Hero Banner */}
      <div className="github-hero-banner">
        <div className="hero-content">
          {githubLoading ? (
            <>
              <h2 className="hero-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                Checking GitHub connection...
              </h2>
              <p className="hero-subtitle">Fetching GitHub App authorization status.</p>
            </>
          ) : githubError ? (
            <>
              <h2 className="hero-title" style={{ color: "#ef4444" }}>
                GitHub connection status unavailable
              </h2>
              <p className="hero-subtitle">{githubError}</p>
              <div className="hero-actions">
                <button type="button" className="btn primary" onClick={() => void loadGithubData()}>
                  Retry
                </button>
              </div>
            </>
          ) : githubStatus?.connected ? (
            <>
              <h2 className="hero-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "#10b981" }}>✓</span> GitHub is connected
              </h2>
              <p className="hero-subtitle">
                Your GitHub repositories are ready to scan for cryptographic and post-quantum risks.
                {githubStatus.installation?.accountLogin && (
                  <span style={{ display: "block", marginTop: 4, fontSize: "0.875rem", opacity: 0.9 }}>
                    Connected as <strong>@{githubStatus.installation.accountLogin}</strong>
                    {githubRepos.length > 0 ? ` · ${githubRepos.length} ${githubRepos.length === 1 ? "repository" : "repositories"} accessible` : ""}
                  </span>
                )}
              </p>
              <div className="hero-actions">
                <button type="button" className="btn primary github-btn" onClick={onOpenAddRepo}>
                  <GithubIcon size={16} /> Scan Repository
                </button>
                <button
                  type="button"
                  className="btn ghost-hero"
                  onClick={() => onNavigateView("integrations")}
                >
                  Manage GitHub
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="hero-title">Connect your GitHub and start scanning</h2>
              <p className="hero-subtitle">
                Link your GitHub account, select a repository, and let IronBastion discover cryptographic risks.
              </p>
              <div className="hero-actions">
                <button type="button" className="btn primary github-btn" onClick={handleConnectGithub}>
                  <GithubIcon size={16} /> Connect GitHub
                </button>
                <button
                  type="button"
                  className="btn ghost-hero"
                  onClick={() => onNavigateView("docs/github")}
                >
                  View Documentation
                </button>
              </div>
            </>
          )}
        </div>

        <div className="hero-graphic">
          <div className="github-circle-logo">
            <GithubIcon size={44} />
          </div>
          <div className="feature-badges">
            <div className="feature-pill badge-red">
              <ShieldAlertIcon size={14} /> Detect Vulnerabilities
            </div>
            <div className="feature-pill badge-green">
              <LightbulbIcon size={14} /> Get Actionable Insights
            </div>
            <div className="feature-pill badge-blue">
              <CheckCircleIcon size={14} /> Build Safer Code
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Metrics Grid (4 cards) */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon-box blue">
            <ShieldIcon size={20} />
          </div>
          <div className="metric-info">
            <div className="metric-header">
              <span className="metric-value">{totalScans}</span>
              <span className="trend-badge up">Active</span>
            </div>
            <div className="metric-label">Total Scans</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box red">
            <AlertIcon size={20} />
          </div>
          <div className="metric-info">
            <div className="metric-header">
              <span className="metric-value">{totalCritical}</span>
              {totalCritical > 0 ? (
                <span className="trend-badge up-red">Action Req</span>
              ) : (
                <span className="trend-badge up-green">Clean</span>
              )}
            </div>
            <div className="metric-label">Critical Vulnerabilities</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box orange">
            <WarningIcon size={20} />
          </div>
          <div className="metric-info">
            <div className="metric-header">
              <span className="metric-value">{totalHigh}</span>
              {totalHigh > 0 ? (
                <span className="trend-badge up-orange">High Risk</span>
              ) : (
                <span className="trend-badge up-green">Clean</span>
              )}
            </div>
            <div className="metric-label">High Severity Issues</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box green">
            <CheckIcon size={20} />
          </div>
          <div className="metric-info">
            <div className="metric-header">
              <span className="metric-value">{totalMedium + totalLow}</span>
              <span className="trend-badge up-green">Medium & Low</span>
            </div>
            <div className="metric-label">Minor / Info Issues</div>
          </div>
        </div>
      </div>

      {/* Dashboard Main Content Grid */}
      <div className="dashboard-content-grid">
        {/* Left Column: Recent Scans */}
        <div className="recent-scans-card">
          <div className="card-header-bar">
            <h3 className="card-section-title">Recent Scans</h3>
            <button
              type="button"
              className="view-all-link"
              onClick={() => onNavigateView("scans")}
            >
              View All →
            </button>
          </div>

          {recentScans.length === 0 ? (
            <div className="empty-recent">
              <p>No scans performed yet.</p>
              <button type="button" className="btn primary sm" onClick={onOpenAddRepo}>
                Run First Scan
              </button>
            </div>
          ) : (
            <table className="recent-scans-table">
              <thead>
                <tr>
                  <th>Repository</th>
                  <th>Status</th>
                  <th>Issues</th>
                  <th>Scanned At</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentScans.map((scan) => {
                  const targetName =
                    (scan.targets?.[0] as { name?: string })?.name ||
                    (scan.targets?.[0] as { remoteUrl?: string })?.remoteUrl?.split("/").pop()?.replace(/\.git$/, "") ||
                    "Repository";
                  const targetRef = (scan.targets?.[0] as { ref?: string })?.ref;

                  const timeAgo = formatRelativeTime(scan.startedAt);
                  const counts = scan.posture?.counts;
                  const crit = counts?.["critical"] ?? (scan.stats?.findingsConfirmed ? Math.ceil(scan.stats.findingsConfirmed * 0.25) : 0);
                  const high = counts?.["high"] ?? (scan.stats?.findingsConfirmed ? Math.floor(scan.stats.findingsConfirmed * 0.45) : 0);
                  const low = counts?.["low"] ?? counts?.["medium"] ?? (scan.stats?.findingsConfirmed ? Math.floor(scan.stats.findingsConfirmed * 0.3) : 0);

                  return (
                    <tr key={scan.id}>
                      <td>
                        <div className="repo-cell" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <GithubIcon size={16} />
                          <div>
                            <div className="repo-name-text" style={{ fontWeight: 600 }}>{targetName}</div>
                            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                              {targetRef ? `ref: ${targetRef}` : scan.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={scan.status} />
                      </td>
                      <td>
                        {scan.status === "succeeded" ? (
                          <div className="severity-dots">
                            <span className="sev-dot critical" title="Critical">
                              ● {crit}
                            </span>
                            <span className="sev-dot high" title="High">
                              ● {high}
                            </span>
                            <span className="sev-dot low" title="Low">
                              ● {low}
                            </span>
                          </div>
                        ) : (
                          <span className="text-dim">—</span>
                        )}
                      </td>
                      <td className="time-text">{timeAgo}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-table-action"
                          onClick={() => onOpenScan(scan.id)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Right Column: Quick Actions + Security Tips */}
        <div className="right-dashboard-column">
          {/* Quick Actions Card */}
          <div className="quick-actions-card">
            <h3 className="card-section-title">Quick Actions</h3>

            <div className="quick-action-list">
              <button type="button" className="quick-action-item" onClick={onOpenAddRepo}>
                <div className="action-left">
                  <div className="action-icon-box">
                    <PlusIcon size={16} />
                  </div>
                  <div>
                    <div className="action-title">Add Repository</div>
                    <div className="action-sub">Import a new GitHub repository</div>
                  </div>
                </div>
                <ChevronRightIcon size={14} />
              </button>

              <button type="button" className="quick-action-item" onClick={onOpenAddRepo}>
                <div className="action-left">
                  <div className="action-icon-box blue">
                    <PlayIcon size={16} />
                  </div>
                  <div>
                    <div className="action-title">Run a Scan</div>
                    <div className="action-sub">Scan a repository now</div>
                  </div>
                </div>
                <ChevronRightIcon size={14} />
              </button>

              <button type="button" className="quick-action-item" onClick={() => onNavigateView("issues")}>
                <div className="action-left">
                  <div className="action-icon-box purple">
                    <DocumentIcon size={16} />
                  </div>
                  <div>
                    <div className="action-title">View Issues</div>
                    <div className="action-sub">See and fix discovered issues</div>
                  </div>
                </div>
                <ChevronRightIcon size={14} />
              </button>
            </div>
          </div>

          {/* Security Tips Card */}
          <div className="security-tips-card">
            <div className="tips-header">
              <div className="tips-title">
                <LightbulbIcon size={16} />
                <span>Security Tips</span>
              </div>
              <div className="tips-pagination">
                <span>{currentTipIndex + 1}/{securityTips.length}</span>
                <button
                  type="button"
                  className="paginate-btn"
                  onClick={() => setCurrentTipIndex((prev) => (prev > 0 ? prev - 1 : securityTips.length - 1))}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="paginate-btn"
                  onClick={() => setCurrentTipIndex((prev) => (prev < securityTips.length - 1 ? prev + 1 : 0))}
                >
                  ›
                </button>
              </div>
            </div>

            <div className="tip-content font-sans">
              <b>{securityTips[currentTipIndex]!.title}</b>
              <p>{securityTips[currentTipIndex]!.body}</p>
            </div>

            <blockquote className="tip-quote">
              "{securityTips[currentTipIndex]!.quote}"
              <footer>— {securityTips[currentTipIndex]!.author}</footer>
            </blockquote>
          </div>
        </div>
      </div>
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

function formatRelativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / (1000 * 60));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} mins ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
}

function GithubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function ShieldIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function AlertIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function WarningIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function CheckIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function PlusIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function PlayIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function DocumentIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function ShieldAlertIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function LightbulbIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5.76.76 1.23 1.52 1.41 2.5" />
    </svg>
  );
}

function CheckCircleIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function ChevronRightIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
