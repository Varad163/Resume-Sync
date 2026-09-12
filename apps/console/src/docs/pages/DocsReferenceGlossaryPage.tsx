export function DocsReferenceGlossaryPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>Glossary</h2>
        <p>Key terms, acronyms, and definitions used across the IronBastion platform and post-quantum cryptography ecosystem.</p>
      </section>

      <section className="docs-section">
        <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "12px 24px", lineHeight: "1.6" }}>
          <dt style={{ fontWeight: "bold", color: "var(--accent-blue)" }}>CBOM</dt>
          <dd style={{ margin: 0 }}>Cryptographic Bill of Materials. Standardized JSON specification (CycloneDX 1.6) documenting cryptographic assets.</dd>

          <dt style={{ fontWeight: "bold", color: "var(--accent-blue)" }}>PQC</dt>
          <dd style={{ margin: 0 }}>Post-Quantum Cryptography. Cryptographic algorithms resistant to attack by quantum computers (e.g. ML-KEM-768, ML-DSA-65).</dd>

          <dt style={{ fontWeight: "bold", color: "var(--accent-blue)" }}>Quantum Risk</dt>
          <dd style={{ margin: 0 }}>Vulnerability of classical public-key algorithms to polynomial-time break under Shor's or Grover's quantum algorithms.</dd>

          <dt style={{ fontWeight: "bold", color: "var(--accent-blue)" }}>Crypto Asset</dt>
          <dd style={{ margin: 0 }}>An active algorithm, key length, cipher suite, or library dependency confirmed to exist in executable source code or manifests.</dd>

          <dt style={{ fontWeight: "bold", color: "var(--accent-blue)" }}>Cryptographic Primitive</dt>
          <dd style={{ margin: 0 }}>Low-level building block class (e.g. <code>pke</code>, <code>signature</code>, <code>block-cipher</code>, <code>hash</code>, <code>mac</code>, <code>kdf</code>, <code>kem</code>).</dd>

          <dt style={{ fontWeight: "bold", color: "var(--accent-blue)" }}>Algorithm</dt>
          <dd style={{ margin: 0 }}>Specific mathematical procedure for encryption, signing, or hashing (e.g. <code>RSA-2048</code>, <code>AES-256-GCM</code>, <code>SHA-256</code>).</dd>

          <dt style={{ fontWeight: "bold", color: "var(--accent-blue)" }}>Finding</dt>
          <dd style={{ margin: 0 }}>A confirmed cryptographic vulnerability or weakness identified in a scan campaign.</dd>

          <dt style={{ fontWeight: "bold", color: "var(--accent-blue)" }}>Collector</dt>
          <dd style={{ margin: 0 }}>Deterministic static analysis module that inspects source files, package manifests, or network sockets for candidate detections.</dd>

          <dt style={{ fontWeight: "bold", color: "var(--accent-blue)" }}>SENTINEL</dt>
          <dd style={{ margin: 0 }}>AI agent responsible for candidate adjudication, verifying active code callsites and rejecting false positives.</dd>

          <dt style={{ fontWeight: "bold", color: "var(--accent-blue)" }}>ORACLE</dt>
          <dd style={{ margin: 0 }}>AI agent responsible for assessing sensitivity data lifetime, network exposure, and code reachability.</dd>

          <dt style={{ fontWeight: "bold", color: "var(--accent-blue)" }}>ATLAS</dt>
          <dd style={{ margin: 0 }}>AI agent responsible for summarizing inventory and structuring CycloneDX CBOM metadata.</dd>

          <dt style={{ fontWeight: "bold", color: "var(--accent-blue)" }}>MIGRATE</dt>
          <dd style={{ margin: 0 }}>AI agent responsible for generating prioritized, phased PQC migration waves using sanctioned NIST replacements.</dd>

          <dt style={{ fontWeight: "bold", color: "var(--accent-blue)" }}>CERTIFY</dt>
          <dd style={{ margin: 0 }}>Cryptographic attestation feature generating digitally signed posture certificates backed by AWS KMS or local RSA keys.</dd>

          <dt style={{ fontWeight: "bold", color: "var(--accent-blue)" }}>WATCHTOWER</dt>
          <dd style={{ margin: 0 }}>Continuous monitoring engine that tracks remote Git repositories and computes differential posture changes across commits.</dd>

          <dt style={{ fontWeight: "bold", color: "var(--accent-blue)" }}>Tenant</dt>
          <dd style={{ margin: 0 }}>Isolated customer workspace organization boundary guarded by database Row Level Security (RLS).</dd>

          <dt style={{ fontWeight: "bold", color: "var(--accent-blue)" }}>Installation Token</dt>
          <dd style={{ margin: 0 }}>Short-lived (1-hour) GitHub App access token (<code>ghs_...</code>) generated via RS256 JWT signatures for Git checkouts.</dd>

          <dt style={{ fontWeight: "bold", color: "var(--accent-blue)" }}>KMS</dt>
          <dd style={{ margin: 0 }}>AWS Key Management Service. Hardware security module service providing asymmetric RSA-2048 signing key pairs.</dd>

          <dt style={{ fontWeight: "bold", color: "var(--accent-blue)" }}>Cognito</dt>
          <dd style={{ margin: 0 }}>AWS Cognito User Pools identity service managing user login, OAuth 2.0 PKCE, and JWT token issuance.</dd>

          <dt style={{ fontWeight: "bold", color: "var(--accent-blue)" }}>SQS</dt>
          <dd style={{ margin: 0 }}>AWS Simple Queue Service. Message queue decoupling asynchronous scan execution between API and worker nodes.</dd>

          <dt style={{ fontWeight: "bold", color: "var(--accent-blue)" }}>DLQ</dt>
          <dd style={{ margin: 0 }}>Dead Letter Queue. SQS queue capturing scan jobs that failed 3 consecutive retry attempts.</dd>

          <dt style={{ fontWeight: "bold", color: "var(--accent-blue)" }}>Aurora</dt>
          <dd style={{ margin: 0 }}>AWS Aurora Serverless v2 PostgreSQL database hosting IronBastion relational data with RLS multi-tenancy.</dd>
        </dl>
      </section>
    </div>
  );
}
