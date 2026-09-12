export function DocsUsingCertifyPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>CERTIFY Cryptographic Attestation</h2>
        <p>
          <b>CERTIFY</b> generates tamper-proof, digitally signed compliance certificates asserting an application's Post-Quantum Cryptographic posture and CBOM integrity.
        </p>
      </section>

      <section className="docs-section">
        <h2>Signed Certificate Payload Structure</h2>
        <p>
          The certificate signs a canonical payload string binding scan ID, project metadata, posture score, CBOM SHA-256 hash, and timestamp:
        </p>

        <div style={{ padding: "12px", background: "var(--bg-card)", borderRadius: "6px", border: "1px solid var(--border)", fontFamily: "monospace", fontSize: "12px", color: "var(--text-main)" }}>
          scanId | projectId | projectName | overallPosture | severity | cbomHash | findingsCount | certifiedAt
        </div>
      </section>

      <section className="docs-section">
        <h2>KMS &amp; Local Development Signing</h2>
        <ul>
          <li><b>Production Signing</b>: Uses AWS KMS Asymmetric RSA-2048 key (<code>RSASSA_PKCS1_V1_5_SHA_256</code>) via KMS <code>SignCommand</code> when <code>CERTIFY_KMS_KEY_ARN</code> is configured.</li>
          <li><b>Local Fallback</b>: Uses deterministic in-memory 2048-bit RSA key generation in local development mode (<code>IRONBASTION_AUTH=dev</code>).</li>
          <li><b>Public-Key Verification</b>: Anyone can verify a certificate by retrieving the public key via <code>GET /v1/certify/public-key</code> and validating the signature with SHA-256 RSA verification.</li>
        </ul>
      </section>
    </div>
  );
}
