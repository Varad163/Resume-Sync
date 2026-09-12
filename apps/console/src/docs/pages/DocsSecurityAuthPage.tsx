export function DocsSecurityAuthPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>Authentication Architecture</h2>
        <p>
          IronBastion implements strict bearer token authentication across all API endpoints. Every request is verified against the workspace identity provider, extracting the user principal and tenant boundary.
        </p>
      </section>

      <section className="docs-section">
        <h2>Authentication Modes</h2>
        <ul>
          <li><b>Cognito OAuth 2.0 PKCE (Production)</b>: Incoming HTTP requests carry a <code>Authorization: Bearer &lt;jwt&gt;</code> token. The token is cryptographically verified against AWS Cognito JWKS endpoints.</li>
          <li><b>Dev Mode Fallback (Local Development)</b>: When <code>IRONBASTION_AUTH=dev</code> is set, the API accepts dev tokens of the format <code>dev.&lt;tenantId&gt;.&lt;email&gt;</code>. Dev mode is strictly disabled in production builds.</li>
        </ul>
      </section>

      <section className="docs-section">
        <h2>JWT Validation &amp; Claims</h2>
        <p>Production authentication validates the following standard and custom claims on every API call:</p>
        <table className="docs-table" style={{ width: "100%", borderCollapse: "collapse", marginTop: "16px" }}>
          <thead>
            <tr style={{ background: "var(--bg-card)", textAlign: "left" }}>
              <th style={{ padding: "10px", border: "1px solid var(--border)" }}>Claim</th>
              <th style={{ padding: "10px", border: "1px solid var(--border)" }}>Validation Rule</th>
              <th style={{ padding: "10px", border: "1px solid var(--border)" }}>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>iss</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Exact URL match</td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Must match <code>https://cognito-idp.&#123;region&#125;.amazonaws.com/&#123;userPoolId&#125;</code>.</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>token_use</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>id</code> or <code>access</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Must be an ID or Access token from Cognito.</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>client_id / aud</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Matches <code>COGNITO_CLIENT_ID</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Rejects tokens issued for different application clients.</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>custom:tenant_id</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Required non-empty string</td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Binds the authenticated session to a specific workspace tenant.</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
