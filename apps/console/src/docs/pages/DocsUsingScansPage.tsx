export function DocsUsingScansPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>Scans Page &amp; Execution Lifecycle</h2>
        <p>
          The <b>Scans</b> page displays historical and active scan runs across your projects, showing scan status, phase progress, target repositories, findings counts, and overall posture scores.
        </p>
      </section>

      <section className="docs-section">
        <h2>Starting a Scan</h2>
        <ol>
          <li>Click <b>+ Add Repository</b> or open a project on the <b>Repositories</b> page.</li>
          <li>Select the project and click <b>Start Security Scan</b>.</li>
          <li>The API creates a scan record with status <code>queued</code> and enqueues a job into the SQS scan queue.</li>
          <li>The background worker daemon dequeues the scan message, updates status to <code>running</code>, and executes the 6-phase campaign.</li>
        </ol>
      </section>

      <section className="docs-section">
        <h2>Scan Status Lifecycle</h2>
        <table className="docs-table" style={{ width: "100%", borderCollapse: "collapse", marginTop: "16px" }}>
          <thead>
            <tr style={{ background: "var(--bg-card)", textAlign: "left" }}>
              <th style={{ padding: "10px", border: "1px solid var(--border)" }}>Status</th>
              <th style={{ padding: "10px", border: "1px solid var(--border)" }}>Meaning</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>queued</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Scan is persisted in DB and waiting in SQS queue for worker pick-up.</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>running</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Worker is actively executing static collectors and AI agent pipeline phases.</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>succeeded</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Campaign finished cleanly; findings, CBOM, posture, and migration plan are persisted.</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>failed</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Scan encountered an unhandled error (e.g., repository clone timeout, corrupt ZIP archive). Error message is recorded in scan log.</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
