interface DocsQuickStartPageProps {
  onNavigate: (path: string) => void;
}

export function DocsQuickStartPage({ onNavigate }: DocsQuickStartPageProps) {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>Your First Security Scan in 12 Steps</h2>
        <p>Follow this step-by-step walkthrough to analyze your repository and view your PQC migration plan:</p>

        <ol className="docs-step-list">
          <li>
            <b>Open IronBastion Console:</b> Sign in to your workspace dashboard.
          </li>
          <li>
            <b>Click "+ Add Repository":</b> Located in the top header or quick actions card.
          </li>
          <li>
            <b>Choose Your Source:</b> Select <i>GitHub App</i>, <i>Manual Git URL</i>, or <i>Upload ZIP</i>.
          </li>
          <li>
            <b>Select Repository &amp; Branch:</b> Pick the target repository (e.g. <code>acme-payments</code>) and target branch (e.g. <code>main</code>).
          </li>
          <li>
            <b>Click "Start Security Scan":</b> Queues the scan through the fast background runner pipeline.
          </li>
          <li>
            <b>Monitor Scan Progress:</b> Watch live execution phases (Collector → Sentinel → Oracle → Migrate) on the Scan Detail page.
          </li>
          <li>
            <b>Review Security Posture:</b> Inspect the overall Posture Score (e.g. <code>95 / CRITICAL</code>) and confirmed findings count.
          </li>
          <li>
            <b>Explore Cryptographic Inventory:</b> Click the <b>Inventory</b> tab to view all discovered cryptographic primitives, key lengths, and locations.
          </li>
          <li>
            <b>Inspect Security Findings:</b> View confirmed vulnerabilities categorized by severity (Critical, High, Medium, Low).
          </li>
          <li>
            <b>Download CycloneDX CBOM:</b> Click <b>Download CBOM</b> to save the standardized JSON artifact.
          </li>
          <li>
            <b>Review Migration Plan:</b> Open the <b>Plan</b> tab to view estimated remediation effort (~10–25 days total) and customize target waves.
          </li>
          <li>
            <b>Enable Watchtower Polling:</b> Toggle automatic Git commit monitoring in <b>Settings</b> to track posture changes over time.
          </li>
        </ol>
      </section>

      <section className="docs-section">
        <h2>Next Steps</h2>
        <div className="docs-cards-grid">
          <div className="docs-card" onClick={() => onNavigate("/docs/scanning/github")}>
            <h3>🐙 Set Up GitHub App</h3>
            <p>Connect your GitHub account for seamless repository import and automated branch authorization.</p>
          </div>
          <div className="docs-card" onClick={() => onNavigate("/docs/outputs/migration-plan")}>
            <h3>🗺️ Customize Migration Waves</h3>
            <p>Learn how to re-assign migration actions across waves using the Migration Wave Simulator.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
