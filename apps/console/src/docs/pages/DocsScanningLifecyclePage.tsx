export function DocsScanningLifecyclePage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>Scan Execution Lifecycle</h2>
        <p>
          Every scan campaign in IronBastion executes through 6 sequential phases managed by the campaign runner engine.
        </p>
      </section>

      <section className="docs-section">
        <h2>Phase Breakdown</h2>
        <table className="docs-table" style={{ width: "100%", borderCollapse: "collapse", marginTop: "16px" }}>
          <thead>
            <tr style={{ background: "var(--bg-card)", textAlign: "left" }}>
              <th style={{ padding: "10px", border: "1px solid var(--border)" }}>Phase</th>
              <th style={{ padding: "10px", border: "1px solid var(--border)" }}>Name</th>
              <th style={{ padding: "10px", border: "1px solid var(--border)" }}>Responsibility</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>1</td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><b>DISCOVER</b></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Checkout Git repository or extract ZIP archive into ephemeral workspace.</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>2</td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><b>COLLECT</b></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Run static collectors (JVM, Python, JS/TS, dependencies, TLS probe) to extract candidate detections.</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>3</td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><b>ADJUDICATE</b></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>SENTINEL</code> agent filters false positives and confirms active cryptographic code.</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>4</td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><b>ASSESS</b></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>ORACLE</code> agent evaluates data lifetime &amp; exposure; deterministic engine computes risk score.</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>5</td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><b>PLAN</b></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>ATLAS</code> agent summarizes inventory; <code>MIGRATE</code> agent builds prioritized PQC migration waves.</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>6</td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><b>REPORT</b></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Persists CBOM JSON, findings, posture, agent traces, and deletes ephemeral working directories.</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
