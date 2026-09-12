export function DocsScanningRiskScoringPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>Deterministic Risk Scoring Methodology</h2>
        <p>
          IronBastion uses a fixed, deterministic arithmetic formula to compute quantum risk scores (0–100). The formula ensures that two scans of the same codebase with the same evidence produce the exact same numerical result.
        </p>
      </section>

      <section className="docs-section">
        <h2>Mathematical Formula</h2>
        <div style={{ padding: "16px", background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)", fontFamily: "monospace", fontSize: "13px", lineHeight: "1.6", color: "var(--text-main)" }}>
          exposure = (quantumExposure × 0.45) + (dataLifetime × 0.30) + (networkExposure × 0.20) + (migrationDifficulty × 0.05)<br /><br />
          rawScore = Math.round(clamp(exposure × reachabilityGate[reachability]) × 100)
        </div>
      </section>

      <section className="docs-section">
        <h2>Factor Weights &amp; Multipliers</h2>
        <table className="docs-table" style={{ width: "100%", borderCollapse: "collapse", marginTop: "16px" }}>
          <thead>
            <tr style={{ background: "var(--bg-card)", textAlign: "left" }}>
              <th style={{ padding: "10px", border: "1px solid var(--border)" }}>Factor</th>
              <th style={{ padding: "10px", border: "1px solid var(--border)" }}>Weight</th>
              <th style={{ padding: "10px", border: "1px solid var(--border)" }}>Value Mapping</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><b>quantumExposure</b></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>0.45</td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>broken: 1.0 | weakened: 0.5 | safe: 0.05 | unknown: 0.6</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><b>dataLifetime</b></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>0.30</td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>indefinite: 1.0 | long: 0.85 | medium: 0.55 | short: 0.25 | ephemeral: 0.1</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><b>networkExposure</b></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>0.20</td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>external: 1.0 | internal: 0.6 | isolated: 0.25</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><b>migrationDifficulty</b></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>0.05</td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Estimated difficulty score (0.0 to 1.0)</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><b>reachabilityGate</b></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Gate Multiplier</td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>runtime: 1.0 | build-only: 0.5 | test-only: 0.25 | dead-code: 0.15</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="docs-section">
        <h2>Overrides &amp; Caps</h2>
        <ul>
          <li><b>Classically Broken Floor</b>: If an algorithm is broken classically (e.g. SHA-1 or MD5) and reachable at runtime, the score is floored at <b>65</b> (High severity).</li>
          <li><b>Test-Only Code Cap</b>: If a finding is restricted to test code paths, its score is capped at <b>35</b> (Low severity).</li>
        </ul>
      </section>

      <section className="docs-section">
        <h2>Severity Boundaries</h2>
        <ul>
          <li><code>score &gt;= 80</code> &rarr; <b>CRITICAL</b></li>
          <li><code>score &gt;= 60</code> &rarr; <b>HIGH</b></li>
          <li><code>score &gt;= 40</code> &rarr; <b>MEDIUM</b></li>
          <li><code>score &gt;= 20</code> &rarr; <b>LOW</b></li>
          <li><code>score &lt; 20</code> &rarr; <b>INFORMATIONAL</b></li>
        </ul>
      </section>
    </div>
  );
}
