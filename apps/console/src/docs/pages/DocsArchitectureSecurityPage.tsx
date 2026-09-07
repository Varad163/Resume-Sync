export function DocsArchitectureSecurityPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>Security Model &amp; Data Handling</h2>
        <p>
          IronBastion is designed from the ground up to operate securely in zero-trust enterprise environments.
        </p>

        <div className="docs-cards-grid">
          <div className="docs-card">
            <h3>🏢 Tenant Isolation</h3>
            <p>Database queries enforce strict <code>tenant_id</code> scoping on all projects, targets, scans, and audit entries.</p>
          </div>
          <div className="docs-card">
            <h3>🔑 Read-Only Integration</h3>
            <p>GitHub App authorization uses minimum required read-only repository permissions.</p>
          </div>
          <div className="docs-card">
            <h3>🧹 Source Cleanup</h3>
            <p>Checked out Git repos and ZIP archives are extracted to ephemeral folders and wiped immediately post-scan.</p>
          </div>
          <div className="docs-card">
            <h3>📜 Immutable Audit Log</h3>
            <p>Mutating actions record actor, timestamp, action, and subject details in the tenant audit log.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
