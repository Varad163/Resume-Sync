export function DocsArchitectureDatabasePage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>Database Architecture</h2>
        <p>
          The database package (<code>packages/db</code>) supports both local embedded <b>PGLite</b> for development/testing and <b>AWS Aurora Serverless v2 PostgreSQL</b> for production.
        </p>
      </section>

      <section className="docs-section">
        <h2>Database Schema &amp; Entities</h2>
        <ul>
          <li><code>tenants</code>: Customer organization accounts.</li>
          <li><code>users</code>: Authenticated workspace members with role assignments.</li>
          <li><code>projects</code>: Multi-target project configurations and monitoring intervals.</li>
          <li><code>github_installations</code>: GitHub App installation IDs and account metadata.</li>
          <li><code>scans</code>: Scan execution records, status, phase, targets, posture scores, and stats.</li>
          <li><code>findings</code>: Confirmed cryptographic vulnerabilities with risk scores and document JSON.</li>
          <li><code>artefacts</code>: CBOM JSON, agent traces, and collector run logs.</li>
          <li><code>audit_log</code>: Immutable tenant audit records for user actions.</li>
        </ul>
      </section>
    </div>
  );
}
