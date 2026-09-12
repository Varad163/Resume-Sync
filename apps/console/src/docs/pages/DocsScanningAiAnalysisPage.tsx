export function DocsScanningAiAnalysisPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>AI Agent Architecture</h2>
        <p>
          IronBastion employs four specialized LLM agents—<code>SENTINEL</code>, <code>ORACLE</code>, <code>ATLAS</code>, and <code>MIGRATE</code>—operating under structured JSON schema validation.
        </p>
      </section>

      <section className="docs-section">
        <h2>Agent Responsibilities &amp; Flow Diagram</h2>

        <div style={{ padding: "16px", background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)", fontFamily: "monospace", fontSize: "12px", textAlign: "center", lineHeight: "1.8", margin: "20px 0" }}>
          Collectors &rarr; Candidates &rarr; SENTINEL &rarr; ORACLE &rarr; Risk Engine &rarr; ATLAS &rarr; MIGRATE &rarr; CBOM + Report + Plan
        </div>

        <table className="docs-table" style={{ width: "100%", borderCollapse: "collapse", marginTop: "16px" }}>
          <thead>
            <tr style={{ background: "var(--bg-card)", textAlign: "left" }}>
              <th style={{ padding: "10px", border: "1px solid var(--border)" }}>Agent</th>
              <th style={{ padding: "10px", border: "1px solid var(--border)" }}>Prompt Version</th>
              <th style={{ padding: "10px", border: "1px solid var(--border)" }}>Primary Purpose</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><b>SENTINEL</b></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>sentinel-v1</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Adjudicate candidate detections; confirm active usage and reject false positives.</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><b>ORACLE</b></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>oracle-v1</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Assess sensitivity lifetime, reachability, and network exposure.</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><b>ATLAS</b></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>atlas-v1</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Summarize inventory across components and build CycloneDX CBOM metadata.</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><b>MIGRATE</b></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>migrate-v1</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Construct phased migration waves using sanctioned NIST PQC algorithm replacements.</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="docs-section">
        <h2>Guardrails &amp; Constraints</h2>
        <ul>
          <li><b>Agents Cannot Invent Detections</b>: Detections MUST originate from raw static collector candidates. Agents cannot synthesize non-existent files or fake lines.</li>
          <li><b>Deterministic Scoring Independence</b>: The final numeric risk score is computed by a fixed mathematical formula, not directly picked by AI agents.</li>
        </ul>
      </section>
    </div>
  );
}
