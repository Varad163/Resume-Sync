export function DocsScanningReposPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>Supported Scanning Methods</h2>
        <p>
          IronBastion offers four distinct methods to ingest codebases and run security scans based on your team's workflow and deployment requirements:
        </p>

        <div className="docs-table-wrapper">
          <table className="docs-table">
            <thead>
              <tr>
                <th>Method</th>
                <th>Best Used For</th>
                <th>Authentication</th>
                <th>Automation</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>GitHub App</b></td>
                <td>Production teams, organization-wide visibility, and private GitHub repos.</td>
                <td>OAuth Token / GitHub App installation</td>
                <td>Automatic commit polling &amp; webhooks</td>
              </tr>
              <tr>
                <td><b>Git URL</b></td>
                <td>Public repositories or custom Git servers (GitLab, Bitbucket, self-hosted).</td>
                <td>Public URL or SSH/Token credentials</td>
                <td>Watchtower background polling</td>
              </tr>
              <tr>
                <td><b>ZIP Upload</b></td>
                <td>Offline projects, legacy codebases, or local developer testing without Git history.</td>
                <td>Console Session Token</td>
                <td>Manual trigger via Console</td>
              </tr>
              <tr>
                <td><b>CLI Scanner</b></td>
                <td>Local developer workstations, air-gapped systems, and CI/CD build scripts.</td>
                <td>Local execution / API Token</td>
                <td>CI/CD pipeline script execution</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="docs-section">
        <h2>Target Isolation &amp; Checkout Mechanics</h2>
        <p>
          Regardless of the ingest method, IronBastion checks out or extracts code into isolated, ephemeral working directories.
          Raw source code files are cleaned up immediately after static collectors extract cryptographic primitives, preserving data privacy and security.
        </p>
      </section>
    </div>
  );
}
