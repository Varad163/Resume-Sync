interface DocsOverviewPageProps {
  onNavigate: (path: string) => void;
}

export function DocsOverviewPage({ onNavigate }: DocsOverviewPageProps) {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>Overview &amp; Mission</h2>
        <p>
          <b>IronBastion</b> is an enterprise-grade Post-Quantum Cryptographic (PQC) Security Posture and Cryptographic Bill of Materials (CBOM) Management Platform.
          It discovers cryptographic assets across multi-language repositories, assesses quantum vulnerability risks using deterministic scoring and specialized AI agents, exports standardized CycloneDX 1.6 CBOM artifacts, and builds actionable post-quantum migration roadmaps.
        </p>
        <p>
          As quantum computing capabilities advance, classical public-key cryptography—including RSA, ECDSA, and ECDH—faces existential threats from Shor's algorithm. IronBastion provides security engineers and enterprise leaders with end-to-end visibility and verifiable cryptographic attestation to transition smoothly to NIST PQC standards (such as ML-KEM-768 and ML-DSA-65).
        </p>
      </section>

      {/* Flow Diagram */}
      <section className="docs-section">
        <h2>High-Level Platform Flow</h2>
        <p>Click any stage in the flow below to jump directly to its documentation page:</p>
        
        <div className="docs-flow-diagram" style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center", justifyContent: "center", margin: "20px 0" }}>
          <div className="flow-step" onClick={() => onNavigate("/docs/using/repositories")} style={{ cursor: "pointer", padding: "12px 16px", background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)", textAlign: "center", minWidth: "120px" }}>
            <div className="step-num" style={{ fontSize: "11px", color: "var(--accent-blue)", fontWeight: 700 }}>STAGE 1</div>
            <div className="step-title" style={{ fontSize: "14px", fontWeight: 600 }}>Repository</div>
            <div className="step-sub" style={{ fontSize: "11px", color: "var(--dim)" }}>GitHub / ZIP / CLI</div>
          </div>
          <div className="flow-arrow" style={{ color: "var(--dim)" }}>↓</div>

          <div className="flow-step" onClick={() => onNavigate("/docs/scanning/lifecycle")} style={{ cursor: "pointer", padding: "12px 16px", background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)", textAlign: "center", minWidth: "120px" }}>
            <div className="step-num" style={{ fontSize: "11px", color: "var(--accent-blue)", fontWeight: 700 }}>STAGE 2</div>
            <div className="step-title" style={{ fontSize: "14px", fontWeight: 600 }}>Discovery</div>
            <div className="step-sub" style={{ fontSize: "11px", color: "var(--dim)" }}>Target Checkout</div>
          </div>
          <div className="flow-arrow" style={{ color: "var(--dim)" }}>↓</div>

          <div className="flow-step" onClick={() => onNavigate("/docs/scanning/source-code")} style={{ cursor: "pointer", padding: "12px 16px", background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)", textAlign: "center", minWidth: "120px" }}>
            <div className="step-num" style={{ fontSize: "11px", color: "var(--accent-blue)", fontWeight: 700 }}>STAGE 3</div>
            <div className="step-title" style={{ fontSize: "14px", fontWeight: 600 }}>Crypto Detection</div>
            <div className="step-sub" style={{ fontSize: "11px", color: "var(--dim)" }}>Collectors &amp; AST</div>
          </div>
          <div className="flow-arrow" style={{ color: "var(--dim)" }}>↓</div>

          <div className="flow-step" onClick={() => onNavigate("/docs/scanning/ai-analysis")} style={{ cursor: "pointer", padding: "12px 16px", background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)", textAlign: "center", minWidth: "120px" }}>
            <div className="step-num" style={{ fontSize: "11px", color: "var(--accent-blue)", fontWeight: 700 }}>STAGE 4</div>
            <div className="step-title" style={{ fontSize: "14px", fontWeight: 600 }}>AI Analysis</div>
            <div className="step-sub" style={{ fontSize: "11px", color: "var(--dim)" }}>SENTINEL &amp; ORACLE</div>
          </div>
          <div className="flow-arrow" style={{ color: "var(--dim)" }}>↓</div>

          <div className="flow-step" onClick={() => onNavigate("/docs/scanning/risk-scoring")} style={{ cursor: "pointer", padding: "12px 16px", background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)", textAlign: "center", minWidth: "120px" }}>
            <div className="step-num" style={{ fontSize: "11px", color: "var(--accent-blue)", fontWeight: 700 }}>STAGE 5</div>
            <div className="step-title" style={{ fontSize: "14px", fontWeight: 600 }}>Risk Scoring</div>
            <div className="step-sub" style={{ fontSize: "11px", color: "var(--dim)" }}>Deterministic Formula</div>
          </div>
          <div className="flow-arrow" style={{ color: "var(--dim)" }}>↓</div>

          <div className="flow-step" onClick={() => onNavigate("/docs/using/cbom")} style={{ cursor: "pointer", padding: "12px 16px", background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)", textAlign: "center", minWidth: "120px" }}>
            <div className="step-num" style={{ fontSize: "11px", color: "var(--accent-blue)", fontWeight: 700 }}>STAGE 6</div>
            <div className="step-title" style={{ fontSize: "14px", fontWeight: 600 }}>CBOM</div>
            <div className="step-sub" style={{ fontSize: "11px", color: "var(--dim)" }}>CycloneDX 1.6 Export</div>
          </div>
          <div className="flow-arrow" style={{ color: "var(--dim)" }}>↓</div>

          <div className="flow-step" onClick={() => onNavigate("/docs/using/migration-plan")} style={{ cursor: "pointer", padding: "12px 16px", background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)", textAlign: "center", minWidth: "120px" }}>
            <div className="step-num" style={{ fontSize: "11px", color: "var(--accent-blue)", fontWeight: 700 }}>STAGE 7</div>
            <div className="step-title" style={{ fontSize: "14px", fontWeight: 600 }}>Migration Plan</div>
            <div className="step-sub" style={{ fontSize: "11px", color: "var(--dim)" }}>MIGRATE Agent Waves</div>
          </div>
          <div className="flow-arrow" style={{ color: "var(--dim)" }}>↓</div>

          <div className="flow-step" onClick={() => onNavigate("/docs/using/certify")} style={{ cursor: "pointer", padding: "12px 16px", background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)", textAlign: "center", minWidth: "120px" }}>
            <div className="step-num" style={{ fontSize: "11px", color: "var(--accent-blue)", fontWeight: 700 }}>STAGE 8</div>
            <div className="step-title" style={{ fontSize: "14px", fontWeight: 600 }}>Certify &amp; Monitor</div>
            <div className="step-sub" style={{ fontSize: "11px", color: "var(--dim)" }}>CERTIFY &amp; WATCHTOWER</div>
          </div>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section className="docs-section">
        <h2>Explore Documentation Topics</h2>
        <div className="docs-cards-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px", marginTop: "16px" }}>
          <div className="docs-card" onClick={() => onNavigate("/docs/quick-start")} style={{ cursor: "pointer", padding: "20px", background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "16px", color: "var(--text-main)", marginBottom: "8px" }}>🚀 Get Started</h3>
            <p style={{ fontSize: "13px", color: "var(--dim)", margin: 0 }}>Connect a repository and execute your first automated post-quantum scan in minutes.</p>
          </div>

          <div className="docs-card" onClick={() => onNavigate("/docs/using/findings")} style={{ cursor: "pointer", padding: "20px", background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "16px", color: "var(--text-main)", marginBottom: "8px" }}>🔍 Understand Results</h3>
            <p style={{ fontSize: "13px", color: "var(--dim)", margin: 0 }}>Analyze security findings, discovered crypto assets, risk scores, and provenances.</p>
          </div>

          <div className="docs-card" onClick={() => onNavigate("/docs/using/migration-plan")} style={{ cursor: "pointer", padding: "20px", background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "16px", color: "var(--text-main)", marginBottom: "8px" }}>📅 Plan Migration</h3>
            <p style={{ fontSize: "13px", color: "var(--dim)", margin: 0 }}>Explore prioritized PQC remediation waves, effort sizing, and replacement algorithms.</p>
          </div>

          <div className="docs-card" onClick={() => onNavigate("/docs/using/watchtower")} style={{ cursor: "pointer", padding: "20px", background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "16px", color: "var(--text-main)", marginBottom: "8px" }}>🛡️ Continuous Monitoring</h3>
            <p style={{ fontSize: "13px", color: "var(--dim)", margin: 0 }}>Track repository commit changes with Watchtower to detect introduced vulnerabilities.</p>
          </div>

          <div className="docs-card" onClick={() => onNavigate("/docs/using/certify")} style={{ cursor: "pointer", padding: "20px", background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "16px", color: "var(--text-main)", marginBottom: "8px" }}>📜 Certify Posture</h3>
            <p style={{ fontSize: "13px", color: "var(--dim)", margin: 0 }}>Generate cryptographically signed compliance attestations backed by AWS KMS.</p>
          </div>

          <div className="docs-card" onClick={() => onNavigate("/docs/integrations/github-app")} style={{ cursor: "pointer", padding: "20px", background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "16px", color: "var(--text-main)", marginBottom: "8px" }}>🔗 Integrate GitHub</h3>
            <p style={{ fontSize: "13px", color: "var(--dim)", margin: 0 }}>Configure read-only GitHub App access with short-lived installation access tokens.</p>
          </div>

          <div className="docs-card" onClick={() => onNavigate("/docs/architecture/system")} style={{ cursor: "pointer", padding: "20px", background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "16px", color: "var(--text-main)", marginBottom: "8px" }}>🏗️ Architecture</h3>
            <p style={{ fontSize: "13px", color: "var(--dim)", margin: 0 }}>Deep dive into monorepo structure, worker queues, agents, and database engine.</p>
          </div>

          <div className="docs-card" onClick={() => onNavigate("/docs/security/multi-tenancy")} style={{ cursor: "pointer", padding: "20px", background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "16px", color: "var(--text-main)", marginBottom: "8px" }}>🔒 Security &amp; Access</h3>
            <p style={{ fontSize: "13px", color: "var(--dim)", margin: 0 }}>Review PostgreSQL Row Level Security (RLS), Cognito OAuth PKCE, and ephemeral checkouts.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
