import { useCallback, useEffect, useState } from "react";
import { api, type GithubStatusResponse, type GithubRepository } from "../api.js";

interface IntegrationsPageProps {
  onNavigateDocs?: () => void;
}

export function IntegrationsPage({ onNavigateDocs }: IntegrationsPageProps) {
  const [githubStatus, setGithubStatus] = useState<GithubStatusResponse | null>(null);
  const [githubRepos, setGithubRepos] = useState<GithubRepository[]>([]);
  const [error, setError] = useState<string | null>(null);


  
  const loadData = useCallback(async () => {
    setError(null);
    try {
      const status = await api.getGithubStatus();
      setGithubStatus(status);
      if (status.connected) {
        const { repositories } = await api.getGithubRepositories().catch(() => ({ repositories: [] }));
        setGithubRepos(repositories);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void loadData();
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "IRONBASTION_GITHUB_CONNECTED") {
        void loadData();
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [loadData]);

  const handleConnect = async () => {
    setError(null);
    try {
      const { url } = await api.connectGithub();
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.innerWidth - width) / 2;
      const top = window.screenY + (window.innerHeight - height) / 2;
      const popup = window.open(url, "Connect GitHub", `width=${width},height=${height},left=${left},top=${top}`);

      const timer = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(timer);
          void loadData();
        }
      }, 1000);
    } catch (cause) {
      setError((cause as Error).message);
    }
  };

  const handleDisconnect = async () => {
    setError(null);
    try {
      await api.disconnectGithub();
      await loadData();
    } catch (cause) {
      setError((cause as Error).message);
    }
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1 className="page-title">Integrations</h1>
          <p className="page-subtitle">Connect code repositories, CI/CD pipelines, and third-party security infrastructure.</p>
        </div>
      </header>

      {(error || githubStatus?.error) && (
        <div className="banner alert-error" style={{ marginBottom: 20 }}>
          <b>Error: </b>
          {error || githubStatus?.error}
        </div>
      )}

      <div className="integrations-grid">
        {/* GitHub App Integration Card */}
        <div className="integration-card">
          <div className="card-top">
            <div className="integration-icon-box github">
              <GithubIcon size={28} />
            </div>
            <div className="integration-header-info">
              <div className="integration-name">GitHub App</div>
              <div className="integration-vendor">Version Control & Repository Provider</div>
            </div>
            <div className="integration-status">
              {githubStatus?.error ? (
                <span className="status-pill status-failed">Connection Error</span>
              ) : githubStatus?.connected ? (
                <span className="status-pill status-completed">Connected</span>
              ) : (
                <span className="status-pill status-pending">Not Connected</span>
              )}
            </div>
          </div>

          <p className="integration-description">
            Link your GitHub organization or personal account to authorize repository access, auto-discover codebases, and run automated Watchtower scanning on push.
          </p>

          {githubStatus?.connected && githubStatus.installation ? (
            <div className="integration-details-box">
              <div className="detail-row">
                <span className="lbl">Connected Account:</span>
                <span className="val font-mono">{githubStatus.installation.accountLogin}</span>
              </div>
              <div className="detail-row">
                <span className="lbl">Account Type:</span>
                <span className="val">{githubStatus.installation.accountType}</span>
              </div>
              <div className="detail-row">
                <span className="lbl">Authorized Repositories:</span>
                <span className="val font-mono">{githubRepos.length} repositories</span>
              </div>
              {githubRepos.length > 0 && (
                <div className="detail-row">
                  <span className="lbl">Connected Repos:</span>
                  <span className="val font-mono">
                    {githubRepos.slice(0, 3).map((r) => r.fullName).join(", ")}
                    {githubRepos.length > 3 ? ` (+${githubRepos.length - 3} more)` : ""}
                  </span>
                </div>
              )}
            </div>
          ) : null}

          <div className="card-actions">
            {githubStatus?.connected ? (
              <>
                <button type="button" className="btn ghost" onClick={handleConnect}>
                  Manage Access
                </button>
                {onNavigateDocs && (
                  <button type="button" className="btn ghost" onClick={onNavigateDocs}>
                    Setup Guide
                  </button>
                )}
                <button type="button" className="btn ghost text-critical" onClick={handleDisconnect}>
                  Disconnect
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn primary" onClick={handleConnect}>
                  Connect GitHub
                </button>
                {onNavigateDocs && (
                  <button type="button" className="btn ghost" onClick={onNavigateDocs}>
                    Setup Guide
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* AWS S3 / Artifact Storage */}
        <div className="integration-card disabled">
          <div className="card-top">
            <div className="integration-icon-box aws">
              <CloudIcon size={28} />
            </div>
            <div className="integration-header-info">
              <div className="integration-name">AWS S3 Artifact Storage</div>
              <div className="integration-vendor">Cloud Storage & Report Backup</div>
            </div>
            <div className="integration-status">
              <span className="status-pill status-pending">Built-in</span>
            </div>
          </div>
          <p className="integration-description">
            Automatically store scan artifacts, CBOM JSON payloads, and cryptographic certificates in isolated AWS S3 buckets.
          </p>
        </div>

        {/* Slack / Webhook Notifications */}
        <div className="integration-card disabled">
          <div className="card-top">
            <div className="integration-icon-box webhook">
              <BellIcon size={28} />
            </div>
            <div className="integration-header-info">
              <div className="integration-name">Webhook & Slack Alerts</div>
              <div className="integration-vendor">Notifications & Messaging</div>
            </div>
            <div className="integration-status">
              <span className="status-pill status-pending">Coming Soon</span>
            </div>
          </div>
          <p className="integration-description">
            Receive real-time alerts when Watchtower detects new quantum-vulnerable code or broken cryptographic primitives.
          </p>
        </div>
      </div>
    </div>
  );
}

function GithubIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function CloudIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
    </svg>
  );
}

function BellIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
