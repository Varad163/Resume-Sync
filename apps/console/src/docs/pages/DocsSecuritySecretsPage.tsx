export function DocsSecuritySecretsPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>Secrets Management</h2>
        <p>
          IronBastion handles production credentials, database connection strings, GitHub App private keys, and KMS keys with zero-disk exposure.
        </p>
      </section>

      <section className="docs-section">
        <h2>Production Secrets Protections</h2>
        <ul>
          <li><b>AWS Secrets Manager</b>: Secrets (such as database credentials in <code>DATABASE_SECRET</code>) are fetched at container startup directly from AWS Secrets Manager.</li>
          <li><b>GitHub App Private Key</b>: The PEM private key string is held exclusively in memory; it is never written to disk, committed to git, or returned in API responses.</li>
          <li><b>Git Askpass Isolation</b>: Ephemeral GitHub installation tokens are supplied to <code>git clone</code> via memory-backed <code>GIT_ASKPASS</code> scripts, preventing tokens from persisting in <code>.git/config</code> or process logs.</li>
        </ul>
      </section>
    </div>
  );
}
