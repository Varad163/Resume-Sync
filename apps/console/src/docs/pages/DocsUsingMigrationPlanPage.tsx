export function DocsUsingMigrationPlanPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>PQC Migration Plan &amp; Wave Simulator</h2>
        <p>
          The <b>Migration Plan</b> provides security and engineering teams with an actionable, prioritized roadmap to transition from quantum-vulnerable algorithms to NIST-sanctioned Post-Quantum Cryptography standards.
        </p>
      </section>

      <section className="docs-section">
        <h2>Migration Waves &amp; Sizing</h2>
        <p>
          Remediation actions are automatically grouped into phased migration waves by the <code>MIGRATE</code> agent based on severity, reachability, and component dependencies:
        </p>

        <table className="docs-table" style={{ width: "100%", borderCollapse: "collapse", marginTop: "16px" }}>
          <thead>
            <tr style={{ background: "var(--bg-card)", textAlign: "left" }}>
              <th style={{ padding: "10px", border: "1px solid var(--border)" }}>Wave</th>
              <th style={{ padding: "10px", border: "1px solid var(--border)" }}>Priority</th>
              <th style={{ padding: "10px", border: "1px solid var(--border)" }}>Target Findings</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><b>Wave 1: Urgent Mitigation</b></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Immediate</td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Classically broken algorithms (e.g. SHA-1 in runtime signature paths) and externally exposed RSA-2048 keys.</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><b>Wave 2: High Priority</b></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Short-Term</td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Quantum-broken public key encryption (e.g. RSA-2048 / ECDH to ML-KEM-768).</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><b>Wave 3: Medium Priority</b></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Medium-Term</td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>ECDSA / RSA signature schemes to ML-DSA-65 or SLH-DSA.</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><b>Wave 4: Low Priority</b></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Long-Term</td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Symmetric ciphers weakened under Grover's algorithm (e.g. AES-128 to AES-256).</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="docs-section">
        <h2>Editing &amp; Customizing Migration Waves</h2>
        <p>
          Engineers can drag and drop actions across waves, adjust estimated engineer days, and click <b>Save Custom Plan</b> to update the project roadmap.
        </p>
        <div style={{ padding: "12px", background: "var(--bg-card)", borderRadius: "6px", border: "1px solid var(--border)", fontFamily: "monospace", fontSize: "13px" }}>
          PUT /v1/scans/:scanId/migration-plan
        </div>
      </section>
    </div>
  );
}
