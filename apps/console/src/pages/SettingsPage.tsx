import { useEffect, useState } from "react";
import { api, currentToken, type Project, type GithubStatusResponse } from "../api.js";

interface SettingsPageProps {
  projects: Project[];
  onProjectUpdated: () => void;
}

export function SettingsPage({ projects, onProjectUpdated }: SettingsPageProps) {
  const project = projects[0];

  // Watchtower settings state
  const [monitoringEnabled, setMonitoringEnabled] = useState<boolean>(
    project?.monitoringEnabled ?? false
  );
  const [monitoringInterval, setMonitoringInterval] = useState<number>(
    project?.monitoringInterval ?? 1
  );
  const [savingWatchtower, setSavingWatchtower] = useState(false);
  const [watchtowerMsg, setWatchtowerMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Poller trigger state
  const [triggeringPoller, setTriggeringPoller] = useState(false);

  // GitHub state
  const [githubStatus, setGithubStatus] = useState<GithubStatusResponse | null>(null);

  // System health state
  const [health, setHealth] = useState<{ status: string; auth: string; queue: string } | null>(null);

  useEffect(() => {
    if (project) {
      setMonitoringEnabled(project.monitoringEnabled ?? false);
      setMonitoringInterval(project.monitoringInterval ?? 1);
    }
  }, [project]);

  useEffect(() => {
    void api.getGithubStatus().then(setGithubStatus).catch(() => null);
    void api.health().then(setHealth).catch(() => null);
  }, []);

  const handleSaveWatchtower = async () => {
    if (!project) return;
    setSavingWatchtower(true);
    setWatchtowerMsg(null);
    try {
      await api.configureMonitoring(project.id, monitoringEnabled, monitoringInterval);
      setWatchtowerMsg({ type: "success", text: "Watchtower monitoring settings saved successfully." });
      onProjectUpdated();
    } catch (e) {
      setWatchtowerMsg({ type: "error", text: (e as Error).message });
    } finally {
      setSavingWatchtower(false);
    }
  };

  const handleTriggerPoller = async () => {
    if (!project) return;
    setTriggeringPoller(true);
    setWatchtowerMsg(null);
    try {
      const res = await api.monitorProject(project.id);
      setWatchtowerMsg({
        type: "success",
        text: `Poller executed: status is '${res.status}' (Commit: ${res.commitHash ? res.commitHash.slice(0, 7) : "N/A"})`,
      });
      onProjectUpdated();
    } catch (e) {
      setWatchtowerMsg({ type: "error", text: (e as Error).message });
    } finally {
      setTriggeringPoller(false);
    }
  };

  const token = currentToken();

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Configure Watchtower background monitoring, API credentials, and platform preferences.</p>
        </div>
      </header>

      <div className="settings-sections">
        {/* Watchtower Monitoring Section */}
        <div className="settings-card">
          <div className="card-header">
            <h3 className="section-title">
              <WatchtowerIcon /> Watchtower Continuous Monitoring
            </h3>
            <p className="section-subtitle">Automatically poll connected Git repositories for commit changes and queue security scans.</p>
          </div>

          {watchtowerMsg && (
            <div className={`banner alert-${watchtowerMsg.type}`} style={{ marginBottom: 16 }}>
              <b>{watchtowerMsg.type === "success" ? "Success" : "Error"}</b>
              {watchtowerMsg.text}
            </div>
          )}

          <div className="form-stack">
            <div className="form-row-checkbox">
              <input
                type="checkbox"
                id="enable-monitoring"
                checked={monitoringEnabled}
                onChange={(e) => setMonitoringEnabled(e.target.checked)}
              />
              <label htmlFor="enable-monitoring">
                <b>Enable Automatic Git Polling</b>
                <p className="text-dim">Periodically check remote repository references for new commits.</p>
              </label>
            </div>

            <div className="form-group" style={{ maxWidth: 300 }}>
              <label>Polling Interval</label>
              <select
                className="select-input"
                value={monitoringInterval}
                onChange={(e) => setMonitoringInterval(Number.parseInt(e.target.value, 10))}
              >
                <option value={1}>1 Minute (Fastest)</option>
                <option value={5}>5 Minutes</option>
                <option value={15}>15 Minutes</option>
                <option value={60}>1 Hour</option>
              </select>
            </div>

            <div className="poller-status-box">
              <div className="status-item">
                <span className="lbl">Status:</span>
                <span className="val font-mono">
                  {project?.monitoringEnabled ? (
                    <span className="badge-green">● Active (Background Poller)</span>
                  ) : (
                    <span className="badge-gray">Disabled</span>
                  )}
                </span>
              </div>
              <div className="status-item">
                <span className="lbl">Last Checked:</span>
                <span className="val font-mono">
                  {project?.lastMonitoredAt
                    ? new Date(project.lastMonitoredAt).toLocaleString()
                    : "Never"}
                </span>
              </div>
            </div>

            <div className="button-group">
              <button
                type="button"
                className="btn primary"
                onClick={handleSaveWatchtower}
                disabled={savingWatchtower}
              >
                {savingWatchtower ? "Saving Settings…" : "Save Settings"}
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={handleTriggerPoller}
                disabled={triggeringPoller || !project}
              >
                {triggeringPoller ? "Polling Remote…" : "Trigger Poller Now"}
              </button>
            </div>
          </div>
        </div>

        {/* GitHub Integration Status */}
        <div className="settings-card">
          <div className="card-header">
            <h3 className="section-title">
              <GithubIcon /> GitHub Integration
            </h3>
            <p className="section-subtitle">Manage OAuth token access and repository authorization.</p>
          </div>

          <div className="form-stack">
            <div className="poller-status-box">
              <div className="status-item">
                <span className="lbl">App Connection:</span>
                <span className="val font-mono">
                  {githubStatus?.connected ? (
                    <span className="badge-green">Connected ({githubStatus.installation?.accountLogin})</span>
                  ) : (
                    <span className="badge-gray">Not Connected</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Workspace & API Credentials */}
        <div className="settings-card">
          <div className="card-header">
            <h3 className="section-title">
              <KeyIcon /> Workspace & API Credentials
            </h3>
            <p className="section-subtitle">Session token and tenant context.</p>
          </div>

          <div className="form-stack">
            <div className="form-group">
              <label>Current Session Token</label>
              <div className="code-box-small">{token || "No active token"}</div>
            </div>

            {project && (
              <div className="form-group">
                <label>Active Project ID & Tenant ID</label>
                <div className="code-box-small">
                  Project: {project.id} | Tenant: {project.tenantId}
                </div>
              </div>
            )}

            {health && (
              <div className="form-group">
                <label>System API Health</label>
                <div className="code-box-small">
                  API: {health.status} | Auth Mode: {health.auth} | Queue: {health.queue}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function WatchtowerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v20M2 12h20M12 2a10 10 0 0 1 10 10M12 22a10 10 0 0 1-10-10" />
    </svg>
  );
}

function GithubIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.778-7.778zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}
