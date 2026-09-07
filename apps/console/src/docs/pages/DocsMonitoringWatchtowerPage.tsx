export function DocsMonitoringWatchtowerPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>Watchtower Continuous Monitoring</h2>
        <p>
          <b>Watchtower</b> continuously polls connected remote Git repositories for new commits, detects cryptographic changes between scans, and triggers automated re-scans when new primitives are detected.
        </p>

        <h3>Watchtower Lifecycle</h3>
        <div className="docs-flow-diagram">
          <div className="flow-step">
            <div className="step-num">1</div>
            <div className="step-title">Previous Scan</div>
            <div className="step-sub">Baseline Commit SHA</div>
          </div>
          <div className="flow-arrow">→</div>

          <div className="flow-step">
            <div className="step-num">2</div>
            <div className="step-title">Git Poller</div>
            <div className="step-sub">Fetch Remote HEAD</div>
          </div>
          <div className="flow-arrow">→</div>

          <div className="flow-step">
            <div className="step-num">3</div>
            <div className="step-title">SHA Comparison</div>
            <div className="step-sub">Detect New Commits</div>
          </div>
          <div className="flow-arrow">→</div>

          <div className="flow-step">
            <div className="step-num">4</div>
            <div className="step-title">Auto Scan</div>
            <div className="step-sub">Queue Scan on Diff</div>
          </div>
        </div>
      </section>

      <section className="docs-section">
        <h2>Configuring Watchtower</h2>
        <p>
          Configure background polling intervals (1 min, 5 min, 15 min, 1 hr) or click <b>Trigger Poller Now</b> under <b>Settings</b>.
        </p>
      </section>
    </div>
  );
}
