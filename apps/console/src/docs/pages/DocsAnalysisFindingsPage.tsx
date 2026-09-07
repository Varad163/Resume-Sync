export function DocsAnalysisFindingsPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>Understanding Security Findings</h2>
        <p>
          While <b>Inventory</b> catalogs all cryptographic usage, <b>Findings</b> answers: <i>"Which cryptographic implementations pose operational, compliance, or quantum security risks?"</i>
        </p>

        <h3>Finding Fields &amp; Structure</h3>
        <div className="docs-table-wrapper">
          <table className="docs-table">
            <thead>
              <tr>
                <th>Field</th>
                <th>Description</th>
                <th>Example</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>Component</b></td>
                <td>Source package or service component</td>
                <td><code>acme-payments/gateway</code></td>
              </tr>
              <tr>
                <td><b>Algorithm</b></td>
                <td>Current cryptographic algorithm detected</td>
                <td><code>RSA-1024</code> / <code>TLS 1.2</code></td>
              </tr>
              <tr>
                <td><b>Severity</b></td>
                <td>Confirmed severity tier</td>
                <td><span className="badge-red">CRITICAL</span> / <span className="badge-orange">HIGH</span></td>
              </tr>
              <tr>
                <td><b>Location</b></td>
                <td>Source file path &amp; code snippet evidence</td>
                <td><code>src/auth/RSASigner.java:L42</code></td>
              </tr>
              <tr>
                <td><b>Target Algorithm</b></td>
                <td>Recommended NIST PQC or modern primitive replacement</td>
                <td><code>ML-KEM-768</code> / <code>TLS 1.3 HYBRID</code></td>
              </tr>
              <tr>
                <td><b>Approach</b></td>
                <td>Remediation strategy</td>
                <td><code>re-architect</code>, <code>drop-in</code>, <code>protocol-upgrade</code></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
