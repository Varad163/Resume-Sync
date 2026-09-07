interface DocsOverviewPageProps {
  onNavigate: (path: string) => void;
}

export function DocsOverviewPage({ onNavigate }: DocsOverviewPageProps) {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>What is IronBastion?</h2>
        <p>
          <b>IronBastion</b> is an enterprise-grade Zero-Knowledge Cryptographic Posture &amp; Post-Quantum Cryptography (PQC) Migration Platform.
          It discovers cryptographic primitives across software repositories, analyzes asset sensitivity, calculates quantum vulnerability risks, exports standard Cryptographic Bills of Materials (CBOM CycloneDX 1.6), and generates actionable remediation roadmaps.
        </p>
        <p>
          With quantum computing advancements posing an existential threat to classical public-key cryptography (such as RSA and ECDSA), IronBastion equips security teams and engineers to transition systematically toward NIST-standard PQC algorithms like <b>ML-KEM-768</b> and <b>ML-DSA-65</b>.
        </p>
      </section>

      {/* High Level Flow Diagram */}
      <section className="docs-section">
        <h2>High-Level Security Lifecycle</h2>
        <p>IronBastion automates the complete lifecycle from code discovery to continuous monitoring:</p>
        
        <div className="docs-flow-diagram">
          <div className="flow-step" onClick={() => onNavigate("/docs/scanning/repositories")}>
            <div className="step-num">1</div>
            <div className="step-title">Repository</div>
            <div className="step-sub">GitHub / Git / ZIP / CLI</div>
          </div>
          <div className="flow-arrow">→</div>

          <div className="flow-step" onClick={() => onNavigate("/docs/how-it-works")}>
            <div className="step-num">2</div>
            <div className="step-title">Crypto Discovery</div>
            <div className="step-sub">Source &amp; Package Collectors</div>
          </div>
          <div className="flow-arrow">→</div>

          <div className="flow-step" onClick={() => onNavigate("/docs/analysis/inventory")}>
            <div className="step-num">3</div>
            <div className="step-title">Inventory</div>
            <div className="step-sub">CBOM Primitives</div>
          </div>
          <div className="flow-arrow">→</div>

          <div className="flow-step" onClick={() => onNavigate("/docs/analysis/findings")}>
            <div className="step-num">4</div>
            <div className="step-title">Security Analysis</div>
            <div className="step-sub">Sentinel &amp; Oracle Verification</div>
          </div>
          <div className="flow-arrow">→</div>

          <div className="flow-step" onClick={() => onNavigate("/docs/analysis/risk-scoring")}>
            <div className="step-num">5</div>
            <div className="step-title">Risk Scoring</div>
            <div className="step-sub">Quantum Vulnerability Score</div>
          </div>
          <div className="flow-arrow">→</div>

          <div className="flow-step" onClick={() => onNavigate("/docs/outputs/cbom")}>
            <div className="step-num">6</div>
            <div className="step-title">CBOM</div>
            <div className="step-sub">CycloneDX 1.6 Export</div>
          </div>
          <div className="flow-arrow">→</div>

          <div className="flow-step" onClick={() => onNavigate("/docs/outputs/migration-plan")}>
            <div className="step-num">7</div>
            <div className="step-title">Migration Plan</div>
            <div className="step-sub">PQC Roadmap &amp; Waves</div>
          </div>
          <div className="flow-arrow">→</div>

          <div className="flow-step" onClick={() => onNavigate("/docs/monitoring/watchtower")}>
            <div className="step-num">8</div>
            <div className="step-title">Monitoring</div>
            <div className="step-sub">Watchtower Commit Poller</div>
          </div>
        </div>
      </section>

      <section className="docs-section">
        <h2>Core Platform Pillars</h2>
        <div className="docs-cards-grid">
          <div className="docs-card" onClick={() => onNavigate("/docs/analysis/inventory")}>
            <h3>🔍 Complete Visibility</h3>
            <p>Automatically discover classical, weak, and quantum-vulnerable cryptographic algorithms across multi-language projects.</p>
          </div>
          <div className="docs-card" onClick={() => onNavigate("/docs/outputs/migration-plan")}>
            <h3>⚡ Realistic Effort Sizing</h3>
            <p>Generate PQC migration roadmaps sized for modern AI-assisted software development (~0.5d to 6d per remediation item).</p>
          </div>
          <div className="docs-card" onClick={() => onNavigate("/docs/monitoring/watchtower")}>
            <h3>🛡️ Watchtower Monitoring</h3>
            <p>Continuously check remote Git repositories for newly introduced cryptographic weaknesses before production deployment.</p>
          </div>
          <div className="docs-card" onClick={() => onNavigate("/docs/outputs/certify")}>
            <h3>📜 Signed Attestation</h3>
            <p>Produce digitally signed CERTIFY audit certificates containing CBOM cryptographic hashes for compliance verification.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
