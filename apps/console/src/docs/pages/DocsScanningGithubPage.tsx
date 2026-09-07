export function DocsScanningGithubPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>Connecting GitHub to IronBastion</h2>
        <p>
          IronBastion integrates with GitHub via a dedicated <b>GitHub App</b> utilizing read-only permissions to import repositories, list branches, and monitor code for security vulnerabilities.
        </p>

        <div className="docs-callout warning">
          <b>Security Notice:</b> The GitHub App requests <b>Read-Only</b> permissions for <code>Contents</code> and <code>Metadata</code>.
          IronBastion never requests write access or code modification permissions.
        </div>
      </section>

      <section className="docs-section">
        <h2>Local Development GitHub Setup Guide</h2>
        <p>Follow these steps to configure a local development GitHub App:</p>

        <ol className="docs-step-list">
          <li>Go to <b>GitHub Settings → Developer settings → GitHub Apps → New GitHub App</b>.</li>
          <li>Set App Name: <code>IronBastion Local</code>.</li>
          <li>Set Homepage URL: <code>http://localhost:5199</code>.</li>
          <li>Set Callback URL: <code>http://localhost:8787/v1/integrations/github/callback</code>.</li>
          <li>
            Set Repository Permissions:
            <ul className="docs-list">
              <li><code>Contents</code> → <b>Read-only</b></li>
              <li><code>Metadata</code> → <b>Read-only</b></li>
            </ul>
          </li>
          <li>Click <b>Create GitHub App</b>.</li>
          <li>Scroll down to <b>Private keys</b> and click <b>Generate a private key</b> (downloads <code>.pem</code> file).</li>
          <li>Copy App ID, Client ID, Client Secret, and Private Key contents into your root <code>.env</code> file:</li>
        </ol>

        <div className="docs-code-block">
          <pre>{`GITHUB_APP_ID=123456
GITHUB_APP_CLIENT_ID=Iv1.abc123def456
GITHUB_APP_CLIENT_SECRET=0123456789abcdef...
GITHUB_APP_NAME=IronBastion Local
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\\nMIIEowIBAAKCAQEA..."`}</pre>
        </div>

        <div className="docs-callout danger">
          <b>CRITICAL RULE:</b> Never commit <code>.env</code> or <code>.pem</code> files to Git. Private keys belong strictly on the API server.
        </div>
      </section>
    </div>
  );
}
