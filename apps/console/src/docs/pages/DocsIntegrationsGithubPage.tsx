export function DocsIntegrationsGithubPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>GitHub App Integration</h2>
        <p>
          IronBastion integrates directly with GitHub via a dedicated <b>GitHub App</b>. This provides zero-token, enterprise-grade access control for cloning repositories, inspecting branches, and running automated Watchtower scans.
        </p>
      </section>

      <section className="docs-section">
        <h2>1. Why GitHub App is Used</h2>
        <ul>
          <li><b>No Personal Access Tokens (PATs)</b>: Eliminates shared or individual user credentials.</li>
          <li><b>Short-Lived Installation Access Tokens</b>: Generating ephemeral 1-hour access tokens (<code>ghs_...</code>) via RS256 JWT signatures.</li>
          <li><b>Granular Repository Selection</b>: Administrators grant access strictly to selected repositories or entire organizations.</li>
        </ul>
      </section>

      <section className="docs-section">
        <h2>2. Creating &amp; Configuring the GitHub App</h2>
        <ol>
          <li>Navigate to GitHub <b>Settings</b> &rarr; <b>Developer settings</b> &rarr; <b>GitHub Apps</b> &rarr; <b>New GitHub App</b>.</li>
          <li>Set <b>GitHub App name</b> (e.g. <code>IronBastion PQC Scanner</code>).</li>
          <li>Set <b>Homepage URL</b> to your IronBastion instance URL.</li>
          <li>Set <b>Callback URL</b> to:
            <div style={{ margin: "8px 0", padding: "8px 12px", background: "var(--bg-card)", borderRadius: "4px", fontFamily: "monospace", fontSize: "12px" }}>
              https://your-ironbastion-domain.com/v1/integrations/github/callback
            </div>
            <i>(For local dev: <code>http://localhost:5199/v1/integrations/github/callback</code> or <code>http://localhost:8787/v1/integrations/github/callback</code>)</i>
          </li>
          <li>Under <b>Repository permissions</b>, select minimal read-only access:
            <table className="docs-table" style={{ width: "100%", borderCollapse: "collapse", marginTop: "12px" }}>
              <thead>
                <tr style={{ background: "var(--bg-card)", textAlign: "left" }}>
                  <th style={{ padding: "8px", border: "1px solid var(--border)" }}>Permission</th>
                  <th style={{ padding: "8px", border: "1px solid var(--border)" }}>Access</th>
                  <th style={{ padding: "8px", border: "1px solid var(--border)" }}>Reason</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: "8px", border: "1px solid var(--border)" }}><b>Contents</b></td>
                  <td style={{ padding: "8px", border: "1px solid var(--border)" }}>Read-only</td>
                  <td style={{ padding: "8px", border: "1px solid var(--border)" }}>Clone source code into ephemeral worker directory for static analysis.</td>
                </tr>
                <tr>
                  <td style={{ padding: "8px", border: "1px solid var(--border)" }}><b>Metadata</b></td>
                  <td style={{ padding: "8px", border: "1px solid var(--border)" }}>Read-only</td>
                  <td style={{ padding: "8px", border: "1px solid var(--border)" }}>List repositories and default branches.</td>
                </tr>
              </tbody>
            </table>
          </li>
          <li>Generate a <b>Private Key</b> (.pem) and record your <b>App ID</b> and <b>Client ID</b>.</li>
        </ol>
      </section>

      <section className="docs-section">
        <h2>3. Environment Variables</h2>
        <p>Configure the private key and App ID on API and Worker environment config:</p>
        <div style={{ padding: "12px", background: "var(--bg-card)", borderRadius: "6px", border: "1px solid var(--border)", fontFamily: "monospace", fontSize: "12px", whiteSpace: "pre-wrap" }}>
{`GITHUB_APP_ID="123456"
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\\nMIIEowIBAAKCAQEA...\\n-----END RSA PRIVATE KEY-----"
GITHUB_APP_CLIENT_ID="Iv1.xxxxxxxxxxxx"
GITHUB_APP_CLIENT_SECRET="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"`}
        </div>
      </section>

      <section className="docs-section">
        <h2>4. Security Model &amp; Token Lifecycle</h2>
        <ul>
          <li><b>Private Key Remains Backend-Only</b>: The PEM private key never leaves the secure API/Worker process environment.</li>
          <li><b>Askpass Isolation</b>: Git clone commands pass installation tokens using <code>GIT_ASKPASS</code> memory streams; credentials are never written to disk or logs.</li>
          <li><b>CSRF State Protection</b>: Installation OAuth flows pass state parameter checks to prevent cross-site request forgery.</li>
          <li><b>Tenant Isolation</b>: Installation IDs are bound to a tenant ID in the database and guarded by PostgreSQL RLS.</li>
        </ul>
      </section>
    </div>
  );
}
