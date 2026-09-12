export function DocsUsingDashboardPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>Dashboard Overview</h2>
        <p>
          The IronBastion <b>Dashboard</b> provides enterprise security teams with a high-level command center displaying overall security posture, cryptographic asset counts, severity breakdown, and estimated remediation effort.
        </p>
      </section>

      <section className="docs-section">
        <h2>What the Dashboard Displays</h2>
        <ul>
          <li><b>Posture Score &amp; Severity</b>: A 0–100 numerical score representing tenant cryptographic health (0 = clean, 100 = critical exposure). Posture is categorized into Critical, High, Medium, Low, or Informational.</li>
          <li><b>Findings Summary</b>: Total count of confirmed cryptographic findings across monitored projects, categorized by quantum threat level.</li>
          <li><b>Crypto Assets Count</b>: Total count of discovered cryptographic primitives (ciphers, key exchanges, signature schemes, hash functions, certificates, and TLS suites).</li>
          <li><b>Remediation Effort Sizing</b>: Total estimated engineer days required for complete PQC migration, broken down by wave.</li>
          <li><b>Project Overview &amp; Scan History</b>: List of monitored projects, latest scan timestamps, commit SHAs, and status indicators.</li>
        </ul>
      </section>
    </div>
  );
}
