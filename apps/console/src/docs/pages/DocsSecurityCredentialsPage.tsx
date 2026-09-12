export function DocsSecurityCredentialsPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>Workspace &amp; API Credentials</h2>
        <p>
          IronBastion isolates credentials and API access tokens across workspaces to prevent credential leakage or unauthorized administrative cross-access.
        </p>
      </section>

      <section className="docs-section">
        <h2>Security Headers &amp; Sanitization</h2>
        <ul>
          <li><b>Security Response Headers</b>: API endpoints inject <code>X-Content-Type-Options: nosniff</code>, <code>X-Frame-Options: DENY</code>, and <code>Strict-Transport-Security</code> headers on all responses.</li>
          <li><b>Error Sanitization</b>: Unhandled 500 errors return generic user-friendly JSON messages without leaking stack traces or internal environment variables to clients.</li>
          <li><b>Session Wiping</b>: Console UI automatically wipes local stored auth tokens and redirects to login upon encountering HTTP 401 Unauthorized responses.</li>
        </ul>
      </section>
    </div>
  );
}
