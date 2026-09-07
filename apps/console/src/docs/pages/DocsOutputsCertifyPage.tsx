export function DocsOutputsCertifyPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>CERTIFY Cryptographic Proof Certificates</h2>
        <p>
          <b>CERTIFY</b> enables organization security leads to generate cryptographically signed proof certificates for verified security scans.
        </p>

        <h3>Attestation Mechanics</h3>
        <ul className="docs-list">
          <li>Computes a SHA-256 canonical digest of the scan target, posture score, and CBOM JSON payload.</li>
          <li>Signs the digest using IronBastion's platform private key.</li>
          <li>Exposes an anonymous public key endpoint (<code>/v1/certificate-public-key</code>) so third-party auditors can independently verify certificate authenticity.</li>
        </ul>
      </section>
    </div>
  );
}
