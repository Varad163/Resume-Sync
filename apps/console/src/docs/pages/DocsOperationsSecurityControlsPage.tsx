export function DocsOperationsSecurityControlsPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>Enterprise Security Controls</h2>
        <p>
          Summary of technical security controls implemented across the IronBastion platform:
        </p>
      </section>

      <section className="docs-section">
        <h2>Security Controls Summary</h2>
        <ul>
          <li><b>OAuth 2.0 PKCE JWT Authentication</b>: End-to-end token validation via AWS Cognito JWKS.</li>
          <li><b>PostgreSQL Row Level Security (RLS)</b>: Immutable database tenant boundaries.</li>
          <li><b>Ephemeral Disk Storage</b>: Source repositories are cloned to <code>/tmp</code> and deleted immediately after scan completion.</li>
          <li><b>Zip Slip &amp; Path Traversal Protection</b>: 50MB upload limit, entry path validation, and symlink escape checks.</li>
          <li><b>Askpass Git Credential Isolation</b>: Ephemeral GitHub installation tokens held strictly in memory.</li>
          <li><b>HTTP Response Security Headers</b>: Enforces <code>nosniff</code>, <code>DENY</code>, and HSTS response headers.</li>
          <li><b>KMS RSA-2048 Asymmetric Certificate Signing</b>: AWS KMS hardware security module (HSM) signing for CERTIFY attestations.</li>
          <li><b>Log Redaction</b>: Automatic masking of bearer tokens, private keys, authorization headers, and raw source text in application logs.</li>
        </ul>
      </section>
    </div>
  );
}
