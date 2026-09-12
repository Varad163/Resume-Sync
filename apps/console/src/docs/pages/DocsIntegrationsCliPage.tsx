export function DocsIntegrationsCliPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>CLI Scanner (`ironbastion scan`)</h2>
        <p>
          The IronBastion <b>CLI Scanner</b> runs the entire security engine locally on a workstation or inside CI/CD pipelines without requiring a hosted server connection.
        </p>
      </section>

      <section className="docs-section">
        <h2>Usage &amp; Syntax</h2>
        <div style={{ padding: "12px", background: "var(--bg-card)", borderRadius: "6px", border: "1px solid var(--border)", fontFamily: "monospace", fontSize: "13px" }}>
          npm run scan -- /path/to/repo [options]
        </div>
      </section>

      <section className="docs-section">
        <h2>Supported CLI Options</h2>
        <table className="docs-table" style={{ width: "100%", borderCollapse: "collapse", marginTop: "16px" }}>
          <thead>
            <tr style={{ background: "var(--bg-card)", textAlign: "left" }}>
              <th style={{ padding: "10px", border: "1px solid var(--border)" }}>Option</th>
              <th style={{ padding: "10px", border: "1px solid var(--border)" }}>Format</th>
              <th style={{ padding: "10px", border: "1px solid var(--border)" }}>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>--tls</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>host[:port]</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Also probe a live TLS endpoint (e.g. <code>--tls api.example.com:443</code>). Repeatable.</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>--metadata-only</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>flag</td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Send no source text to LLM agents; inspect metadata only.</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>--budget</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>cents</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Model spend ceiling in cents for the scan. Default: 50.</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>--provider</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>aws | anthropic | deterministic</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Select LLM model client provider or deterministic offline rules. Default: auto-detect.</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>--json</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>file</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Write the complete scan result report as JSON.</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>--cbom</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>file</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Write the CycloneDX 1.6 CBOM output to specified file path.</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>--quiet</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>flag</td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Disable progress logs on stderr.</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="docs-section">
        <h2>Exit Codes</h2>
        <ul>
          <li><code>0</code>: Scan completed with non-critical posture (Informational, Low, Medium, or High).</li>
          <li><code>2</code>: Scan completed with <b>CRITICAL</b> severity posture (fails CI/CD build pipelines).</li>
          <li><code>1</code>: Fatal error during invocation or argument parsing.</li>
        </ul>
      </section>
    </div>
  );
}
