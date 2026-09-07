export function DocsOutputsReportsPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>Executive Security Reports</h2>
        <p>
          IronBastion generates standalone, print-ready HTML &amp; PDF executive security reports suitable for CISOs, audit teams, and compliance officers.
        </p>

        <h3>Report Contents</h3>
        <ul className="docs-list">
          <li><b>Executive Summary:</b> High-level risk score, scan timestamp, and target details.</li>
          <li><b>Quantum Vulnerability Posture:</b> Severity breakdown of confirmed findings.</li>
          <li><b>Remediation Roadmap:</b> Phased wave schedule with total estimated days.</li>
          <li><b>CBOM Summary:</b> Discovered cryptographic primitives by type.</li>
        </ul>

        <h3>Opening Reports</h3>
        <p>
          Click the <b>Report</b> button on any completed scan detail page to render the interactive HTML report in a new tab.
        </p>
      </section>
    </div>
  );
}
