export function DocsUsingRepositoriesPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>Repositories Page</h2>
        <p>
          The <b>Repositories</b> page allows security teams to manage connected GitHub repositories, configure target branches, view repository source types, and trigger manual or scheduled scans.
        </p>
      </section>

      <section className="docs-section">
        <h2>Supported Repository Sources</h2>
        <table className="docs-table" style={{ width: "100%", borderCollapse: "collapse", marginTop: "16px" }}>
          <thead>
            <tr style={{ background: "var(--bg-card)", textAlign: "left" }}>
              <th style={{ padding: "10px", border: "1px solid var(--border)" }}>Source Kind</th>
              <th style={{ padding: "10px", border: "1px solid var(--border)" }}>Provider</th>
              <th style={{ padding: "10px", border: "1px solid var(--border)" }}>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>git-repository</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>GitHub App</td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>OAuth installation access token authentication for public or private GitHub repos.</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>git-repository</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Git Remote URL</td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Remote HTTPS Git repository URL with branch specification (e.g. <code>main</code>, <code>master</code>, <code>release/v1</code>).</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>zip-archive</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>ZIP Upload</td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Uploaded ZIP file stored in S3 or local storage (max 50MB limit).</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>tls-endpoint</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>TLS Probe</td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Host and port endpoint for live TLS handshake inspection (e.g. <code>api.example.com:443</code>).</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
