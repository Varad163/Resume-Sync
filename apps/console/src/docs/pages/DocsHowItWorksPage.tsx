export function DocsHowItWorksPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>The 5-Stage Security Pipeline</h2>
        <p>
          IronBastion uses a multi-layered pipeline to transform raw code repositories into audited cryptographic intelligence and actionable remediation plans.
        </p>

        <div className="docs-pipeline-list">
          <div className="pipeline-stage-box">
            <div className="stage-header">
              <span className="stage-number">STAGE 1</span>
              <h3>DISCOVER — Multi-Language Collectors</h3>
            </div>
            <p>
              Deterministic static analysis collectors inspect codebases and project manifests to extract cryptographic usage.
            </p>
            <ul className="docs-list">
              <li><b>JVM Collector:</b> Scans Java bytecode &amp; source for <code>Cipher.getInstance()</code>, <code>KeyPairGenerator</code>, <code>MessageDigest</code>, BouncyCastle, and JCA providers.</li>
              <li><b>npm Collector:</b> Analyzes <code>package.json</code> and Node.js <code>crypto</code> module invocations.</li>
              <li><b>PyPI Collector:</b> Identifies Python <code>cryptography</code>, <code>PyCryptodome</code>, and <code>hashlib</code> primitives.</li>
              <li><b>TLS Collector:</b> Probes live TLS endpoints for cipher suites, certificate key lengths, and protocol versions (e.g. TLS 1.2 vs TLS 1.3 Hybrid).</li>
            </ul>
          </div>

          <div className="pipeline-stage-box">
            <div className="stage-header">
              <span className="stage-number">STAGE 2</span>
              <h3>ANALYZE — Agent Adjudication &amp; Risk Scoring</h3>
            </div>
            <p>Specialized subagents analyze candidate findings to eliminate false positives and score security risks:</p>
            <ul className="docs-list">
              <li><b>SENTINEL Agent:</b> Confirms, rejects, or downgrades raw collector detections by verifying code context, import chains, and operational parameters.</li>
              <li><b>ORACLE Agent:</b> Determines what data or protocol the cryptography protects, sensitive data lifetime, and exposure context.</li>
              <li><b>Deterministic Risk Scorer:</b> Calculates an objective quantum vulnerability score (0–100) based on mathematical breakability under Shor's algorithm.</li>
            </ul>
          </div>

          <div className="pipeline-stage-box">
            <div className="stage-header">
              <span className="stage-number">STAGE 3</span>
              <h3>PLAN — Atlas &amp; Migrate Agent Synthesis</h3>
            </div>
            <p>
              The <b>Migrate Agent</b> aggregates confirmed findings into component-algorithm groups and constructs a phased PQC remediation plan.
              Effort estimates assume modern AI-assisted engineering leverage (e.g. drop-in replacement ~0.5d, re-architecture ~6d).
            </p>
          </div>

          <div className="pipeline-stage-box">
            <div className="stage-header">
              <span className="stage-number">STAGE 4</span>
              <h3>REPORT — CBOM &amp; Audit Artifact Generation</h3>
            </div>
            <p>
              Produces standardized outputs including CycloneDX 1.6 Cryptographic Bill of Materials (CBOM), executive HTML reports, and digitally signed <b>CERTIFY</b> certificates.
            </p>
          </div>

          <div className="pipeline-stage-box">
            <div className="stage-header">
              <span className="stage-number">STAGE 5</span>
              <h3>MONITOR — Watchtower Differential Tracker</h3>
            </div>
            <p>
              <b>Watchtower</b> polls remote Git repositories, compares commit SHAs, detects new or resolved cryptographic primitives, and queues automated re-scans.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
