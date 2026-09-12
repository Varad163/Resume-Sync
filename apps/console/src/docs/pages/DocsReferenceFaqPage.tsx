export function DocsReferenceFaqPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>Frequently Asked Questions (FAQ)</h2>
        <p>Answers to common questions about IronBastion, scanner behavior, data privacy, and post-quantum cryptography.</p>
      </section>

      <section className="docs-section">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ padding: "16px", background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "15px", color: "var(--text-main)", marginTop: 0 }}>What is IronBastion?</h3>
            <p>IronBastion is an enterprise-grade Post-Quantum Cryptographic (PQC) Security Posture and Cryptographic Bill of Materials (CBOM) Management Platform. It discovers cryptographic assets, assesses quantum vulnerability risks, exports CycloneDX 1.6 CBOMs, and builds migration roadmaps.</p>
          </div>

          <div style={{ padding: "16px", background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "15px", color: "var(--text-main)", marginTop: 0 }}>What is a crypto asset?</h3>
            <p>A cryptographic asset is an active cryptographic algorithm, key length, cipher suite, or dependency confirmed to exist in your application's executable source code or manifest declarations.</p>
          </div>

          <div style={{ padding: "16px", background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "15px", color: "var(--text-main)", marginTop: 0 }}>What is a CBOM?</h3>
            <p>A Cryptographic Bill of Materials (CBOM) is a machine-readable JSON inventory artifact (CycloneDX 1.6) detailing all cryptographic primitives, key lengths, certificates, and algorithms used in a software project.</p>
          </div>

          <div style={{ padding: "16px", background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "15px", color: "var(--text-main)", marginTop: 0 }}>What is post-quantum risk?</h3>
            <p>Post-quantum risk refers to the vulnerability of classical public-key cryptography (e.g. RSA, ECDSA, ECDH) to decryption by cryptographically relevant quantum computers running Shor's algorithm, as well as Harvest-Now, Decrypt-Later (HNDL) threats.</p>
          </div>

          <div style={{ padding: "16px", background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "15px", color: "var(--text-main)", marginTop: 0 }}>Does IronBastion scan README files?</h3>
            <p>IronBastion collectors inspect source code files and package manifests. While markdown files may be scanned for context during candidate collection, mentions of algorithms in comments or README text are filtered out during SENTINEL adjudication and do NOT generate false vulnerability findings.</p>
          </div>

          <div style={{ padding: "16px", background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "15px", color: "var(--text-main)", marginTop: 0 }}>Why can a scan have 0 findings?</h3>
            <p>A scan has 0 findings if no active cryptographic callsites exist or if all detected cryptography consists of safe, quantum-resistant algorithms (such as ML-KEM-768 or AES-256-GCM).</p>
          </div>

          <div style={{ padding: "16px", background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "15px", color: "var(--text-main)", marginTop: 0 }}>What languages are currently supported?</h3>
            <p>Java/Kotlin (JVM), Python, JavaScript/TypeScript, and live TLS network endpoints.</p>
          </div>

          <div style={{ padding: "16px", background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "15px", color: "var(--text-main)", marginTop: 0 }}>Does IronBastion store source code?</h3>
            <p>No. Source code repositories are checked out into temporary ephemeral directories for the duration of the scan and forcefully deleted immediately afterwards. Only structured metadata and bounded code snippets are processed.</p>
          </div>

          <div style={{ padding: "16px", background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "15px", color: "var(--text-main)", marginTop: 0 }}>How does GitHub authentication work?</h3>
            <p>IronBastion connects via a dedicated GitHub App using RS256 JWTs to issue short-lived 1-hour Installation Access Tokens. Personal Access Tokens (PATs) are never used or stored.</p>
          </div>

          <div style={{ padding: "16px", background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "15px", color: "var(--text-main)", marginTop: 0 }}>How is CERTIFY secured?</h3>
            <p>CERTIFY attestations sign a canonical posture payload string using an RSA-2048 key backed by AWS KMS (or local RSA in dev mode). Certificates can be verified publicly against the KMS public key.</p>
          </div>

          <div style={{ padding: "16px", background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "15px", color: "var(--text-main)", marginTop: 0 }}>How does multi-tenancy work?</h3>
            <p>Multi-tenancy is enforced at the database level using PostgreSQL Row Level Security (RLS). Every query runs in a tenant session transaction setting <code>ironbastion.current_tenant_id</code>, ensuring strict cross-tenant data isolation.</p>
          </div>

          <div style={{ padding: "16px", background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "15px", color: "var(--text-main)", marginTop: 0 }}>What is WATCHTOWER?</h3>
            <p>WATCHTOWER is IronBastion's continuous monitoring engine. It polls remote Git repositories, checks HEAD commit SHAs, and computes differential posture diffs (introduced, resolved, and persistent findings) across scan runs.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
