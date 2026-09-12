export function DocsUsingIssuesPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>Security Issues Management</h2>
        <p>
          The <b>Issues</b> page provides an interactive view for security leads and developers to filter, triage, and track discovered cryptographic vulnerabilities across scan runs.
        </p>
      </section>

      <section className="docs-section">
        <h2>Features &amp; Implemented Capabilities</h2>
        <ul>
          <li><b>Scan Selector Dropdown</b>: Switch between different completed scan runs to inspect historical security issues.</li>
          <li><b>Severity KPI Pills</b>: Quickly filter findings by threat level: Critical, High, Medium, or Low.</li>
          <li><b>Spectrum Visualization</b>: Visual spectrum chart illustrating the distribution of risk scores across findings.</li>
          <li><b>Detailed Findings Table</b>: Select any finding row to view file path, line number, snippet, risk score explanation, and recommended remediation.</li>
        </ul>
      </section>
    </div>
  );
}
