interface GithubDocsPageProps {
  onBack: () => void;
}

export function GithubDocsPage({ onBack }: GithubDocsPageProps) {
  return (
    <div className="page-container docs-page">
      {/* Top Header */}
      <header className="page-header">
        <div>
          <button type="button" className="btn ghost sm" onClick={onBack} style={{ marginBottom: 12 }}>
            ← Back
          </button>
          <h1 className="page-title">Connect GitHub to IronBastion</h1>
          <p className="page-subtitle">
            Connect your GitHub account to securely scan repositories with IronBastion. IronBastion uses a GitHub App with read-only repository access.
          </p>
        </div>
      </header>

      {/* Guide Steps */}
      <div className="docs-steps-stack">
        {/* Step 1 */}
        <div className="docs-step-card">
          <div className="step-badge">1</div>
          <div className="step-body">
            <h3 className="step-title">Create the GitHub App</h3>
            <ul className="step-list">
              <li>Go to <b>GitHub Settings</b>.</li>
              <li>Open <b>Developer settings</b>.</li>
              <li>Open <b>GitHub Apps</b>.</li>
              <li>Click <b>New GitHub App</b>.</li>
              <li>
                Give the app a name, for example:
                <div className="code-inline">IronBastion Local</div>
              </li>
              <li>
                Set the <b>Homepage URL</b> to:
                <div className="code-block">http://localhost:5199</div>
              </li>
              <li>
                Set the <b>Callback URL</b> to:
                <div className="code-block">http://localhost:8787/v1/integrations/github/callback</div>
              </li>
            </ul>
          </div>
        </div>

        {/* Step 2 */}
        <div className="docs-step-card">
          <div className="step-badge">2</div>
          <div className="step-body">
            <h3 className="step-title">Configure Repository Permissions</h3>
            <p className="step-text">Request only:</p>
            <div className="permission-pills">
              <span className="badge-perm">Contents: Read-only</span>
              <span className="badge-perm">Metadata: Read-only</span>
            </div>
            <p className="step-text text-muted" style={{ marginTop: 10 }}>
              These permissions allow IronBastion to read repository source code and repository metadata strictly for scanning and vulnerability detection.
            </p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="docs-step-card">
          <div className="step-badge">3</div>
          <div className="step-body">
            <h3 className="step-title">Create the Private Key</h3>
            <ul className="step-list">
              <li>Create the GitHub App.</li>
              <li>Open the App's <b>General settings</b>.</li>
              <li>Find <b>Private keys</b>.</li>
              <li>Click <b>Generate a private key</b>.</li>
              <li>Download the generated <code className="code-inline">.pem</code> file.</li>
              <li className="text-warning"><b>Never commit the private key to Git.</b></li>
            </ul>
          </div>
        </div>

        {/* Step 4 */}
        <div className="docs-step-card">
          <div className="step-badge">4</div>
          <div className="step-body">
            <h3 className="step-title">Install the GitHub App</h3>
            <ul className="step-list">
              <li>Open the GitHub App.</li>
              <li>Click <b>Install App</b>.</li>
              <li>Select your GitHub account or organization.</li>
              <li>Choose <b>"Only select repositories"</b> for a restricted setup.</li>
              <li>Select the repositories IronBastion should be allowed to scan.</li>
              <li>Save the installation.</li>
            </ul>
          </div>
        </div>

        {/* Step 5 */}
        <div className="docs-step-card">
          <div className="step-badge">5</div>
          <div className="step-body">
            <h3 className="step-title">Configure IronBastion</h3>
            <p className="step-text">The IronBastion API backend requires these environment variables:</p>
            <div className="env-var-list">
              <code>GITHUB_APP_ID</code>
              <code>GITHUB_APP_PRIVATE_KEY</code>
              <code>GITHUB_APP_CLIENT_ID</code>
              <code>GITHUB_APP_CLIENT_SECRET</code>
              <code>GITHUB_APP_NAME</code>
            </div>
            <div className="banner alert-warning" style={{ marginTop: 12 }}>
              <b>Important Security Note</b>
              These credentials belong strictly on the backend/API server and must never be exposed in frontend code or client bundles.
            </div>
          </div>
        </div>

        {/* Step 6 */}
        <div className="docs-step-card">
          <div className="step-badge">6</div>
          <div className="step-body">
            <h3 className="step-title">Connect from IronBastion</h3>
            <ul className="step-list">
              <li>Return to the IronBastion Console.</li>
              <li>Open <b>Integrations</b> or the GitHub connection area on the Dashboard.</li>
              <li>Click <b>Connect GitHub</b>.</li>
              <li>Complete the GitHub authorization/installation flow in the popup window.</li>
              <li>Return to IronBastion.</li>
            </ul>
          </div>
        </div>

        {/* Step 7 */}
        <div className="docs-step-card">
          <div className="step-badge">7</div>
          <div className="step-body">
            <h3 className="step-title">Select Repository and Branch</h3>
            <ul className="step-list">
              <li>Select the connected GitHub account or organization.</li>
              <li>Select an authorized repository from the dropdown.</li>
              <li>Select the target branch (e.g., <code className="code-inline">main</code>).</li>
              <li>Click <b>Start Security Scan</b>.</li>
            </ul>
          </div>
        </div>

        {/* Step 8 */}
        <div className="docs-step-card">
          <div className="step-badge">8</div>
          <div className="step-body">
            <h3 className="step-title">Review Scan Results</h3>
            <p className="step-text">IronBastion processes the target repository through an automated pipeline:</p>
            <div className="pipeline-flow-diagram">
              <div className="flow-node">GitHub repository</div>
              <div className="flow-arrow">↓</div>
              <div className="flow-node">Repository checkout</div>
              <div className="flow-arrow">↓</div>
              <div className="flow-node">Crypto discovery</div>
              <div className="flow-arrow">↓</div>
              <div className="flow-node">Security analysis</div>
              <div className="flow-arrow">↓</div>
              <div className="flow-node">Quantum risk scoring</div>
              <div className="flow-arrow">↓</div>
              <div className="flow-node">CBOM (Cryptography Bill of Materials)</div>
              <div className="flow-arrow">↓</div>
              <div className="flow-node">PQC migration plan</div>
              <div className="flow-arrow">↓</div>
              <div className="flow-node highlight">Report & Executive Insights</div>
            </div>
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="docs-section-card security-section">
        <h2 className="section-heading">
          <ShieldIcon size={20} /> Security Principles
        </h2>
        <ul className="security-list">
          <li>
            <b>Backend-only Credentials:</b> GitHub App client secrets and private key <code className="code-inline">.pem</code> contents are strictly isolated on the backend server.
          </li>
          <li>
            <b>Least Privilege Access:</b> The GitHub App requests read-only permissions for repository contents and metadata.
          </li>
          <li>
            <b>Secret Safety:</b> Never commit private key <code className="code-inline">.pem</code> files or client secrets to version control.
          </li>
          <li>
            <b>Ephemeral Handling:</b> Source code checked out during scanning is processed in temporary ephemeral workspace directories and never exposed publicly.
          </li>
        </ul>
      </div>

      {/* Troubleshooting Section */}
      <div className="docs-section-card troubleshooting-section">
        <h2 className="section-heading">
          <WrenchIcon size={20} /> Troubleshooting
        </h2>
        <div className="troubleshooting-grid">
          <div className="trouble-item">
            <div className="trouble-problem">Repository does not appear in dropdown</div>
            <div className="trouble-solution">
              Verify that the GitHub App has been installed on that specific repository or organization account with access granted.
            </div>
          </div>

          <div className="trouble-item">
            <div className="trouble-problem">Connection fails or times out</div>
            <div className="trouble-solution">
              Check that <code className="code-inline">GITHUB_APP_ID</code>, client credentials, and <code className="code-inline">GITHUB_APP_PRIVATE_KEY</code> environment variables are configured on the API backend and restart the API server.
            </div>
          </div>

          <div className="trouble-item">
            <div className="trouble-problem">Callback URL error on redirect</div>
            <div className="trouble-solution">
              Verify that the GitHub App callback URL matches <code className="code-inline">http://localhost:8787/v1/integrations/github/callback</code> exactly.
            </div>
          </div>

          <div className="trouble-item">
            <div className="trouble-problem">Repository access denied</div>
            <div className="trouble-solution">
              Verify that the GitHub App has <b>Contents: Read-only</b> and <b>Metadata: Read-only</b> permissions enabled in GitHub App settings.
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Back Button */}
      <div style={{ marginTop: 24 }}>
        <button type="button" className="btn ghost" onClick={onBack}>
          ← Back to Console
        </button>
      </div>
    </div>
  );
}

function ShieldIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function WrenchIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}
