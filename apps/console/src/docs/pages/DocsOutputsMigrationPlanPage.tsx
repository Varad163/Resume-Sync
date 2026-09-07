export function DocsOutputsMigrationPlanPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>PQC Migration Plan &amp; Wave Simulator</h2>
        <p>
          The <b>Migration Plan</b> transforms raw vulnerability findings into a prioritized, wave-based remediation roadmap.
        </p>

        <h3>AI-Era Effort Estimation Philosophy</h3>
        <p>
          Unlike legacy migration calculators that estimate hundreds of engineer-days for simple upgrades, IronBastion uses modern <b>AI-assisted effort sizing</b> assuming automated refactoring, AI coding assistants, and CI/CD testing tooling:
        </p>

        <div className="docs-table-wrapper">
          <table className="docs-table">
            <thead>
              <tr>
                <th>Effort Size</th>
                <th>Estimated Days</th>
                <th>Remediation Approach Example</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>S (Small)</b></td>
                <td><b>0.5 day</b></td>
                <td>Drop-in replacement (e.g. SHA-1 → SHA-384)</td>
              </tr>
              <tr>
                <td><b>M (Medium)</b></td>
                <td><b>1.5 days</b></td>
                <td>Parameter or configuration change (e.g. 3DES → AES-256)</td>
              </tr>
              <tr>
                <td><b>L (Large)</b></td>
                <td><b>3.0 days</b></td>
                <td>Protocol upgrade / hybrid crypto (e.g. TLS 1.2 → TLS 1.3 Hybrid)</td>
              </tr>
              <tr>
                <td><b>XL (Complex)</b></td>
                <td><b>6.0 days</b></td>
                <td>Full component re-architecture (e.g. RSA-1024 → ML-KEM-768)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="docs-section">
        <h2>Migration Wave Simulator</h2>
        <p>
          Engineers can customize their remediation plan directly in the Console:
        </p>
        <ol className="docs-step-list">
          <li>Click <b>Edit Roadmap</b> in the Plan tab.</li>
          <li>Re-assign individual actions to target migration waves (e.g., move low-risk items from Wave 1 to Wave 2).</li>
          <li>Click <b>Save Plan</b>. Custom plans persist per project in the database.</li>
          <li>Click <b>Reset to Baseline</b> at any time to restore the AI baseline plan.</li>
        </ol>
      </section>
    </div>
  );
}
