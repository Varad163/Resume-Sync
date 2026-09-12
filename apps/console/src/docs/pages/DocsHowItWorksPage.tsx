export function DocsHowItWorksPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>End-to-End Execution Architecture</h2>
        <p>
          IronBastion uses a multi-stage pipeline combining deterministic static analysis collectors with four specialized LLM agents (<code>SENTINEL</code>, <code>ORACLE</code>, <code>ATLAS</code>, and <code>MIGRATE</code>).
        </p>

        <div className="callout alert-tip" style={{ padding: "16px", background: "rgba(59, 130, 246, 0.08)", borderLeft: "4px solid #3B82F6", borderRadius: "4px", marginBottom: "20px" }}>
          <strong>Zero-Hallucination Fallback:</strong> If an LLM client is unavailable or budget is exhausted, IronBastion transparently falls back to deterministic rule-based adjudication, assessment, and migration planning so scans always finish reliably.
        </div>
      </section>

      <section className="docs-section">
        <h2>Pipeline Stages &amp; Agent Responsibilities</h2>

        <div className="docs-pipeline-list" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="pipeline-stage-box" style={{ padding: "20px", background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "16px", marginTop: 0, color: "var(--accent-blue)" }}>STAGE 1: Collectors &amp; Candidate Extraction</h3>
            <p>
              Deterministic collectors scan raw source files and package manifests to output candidate detections with exact file paths, line numbers, snippet evidence, and rule IDs.
            </p>
          </div>

          <div className="pipeline-stage-box" style={{ padding: "20px", background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "16px", marginTop: 0, color: "var(--accent-blue)" }}>STAGE 2: SENTINEL Agent (Adjudication)</h3>
            <p>
              The <code>SENTINEL</code> agent evaluates each candidate to filter out comments, documentation mentions, test fixtures, or dummy references, confirming only active cryptographic usage.
            </p>
          </div>

          <div className="pipeline-stage-box" style={{ padding: "20px", background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "16px", marginTop: 0, color: "var(--accent-blue)" }}>STAGE 3: ORACLE Agent &amp; Risk Engine</h3>
            <p>
              The <code>ORACLE</code> agent determines data lifetime, reachability, and network exposure. The platform then feeds this evidence into a deterministic formula to compute the 0–100 quantum risk score.
            </p>
          </div>

          <div className="pipeline-stage-box" style={{ padding: "20px", background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "16px", marginTop: 0, color: "var(--accent-blue)" }}>STAGE 4: ATLAS &amp; MIGRATE Agents</h3>
            <p>
              The <code>ATLAS</code> agent summarizes inventory across components. The <code>MIGRATE</code> agent constructs phased PQC migration waves using sanctioned replacements (e.g. ML-KEM-768 for RSA/ECDH key exchange, ML-DSA-65 for ECDSA signatures).
            </p>
          </div>

          <div className="pipeline-stage-box" style={{ padding: "20px", background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "16px", marginTop: 0, color: "var(--accent-blue)" }}>STAGE 5: Artefact Generation &amp; Monitoring</h3>
            <p>
              Emits CycloneDX 1.6 CBOM JSON, executive HTML report, CERTIFY RSA-2048 / KMS signed certificate, and registers the scan with Watchtower for continuous commit monitoring.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
