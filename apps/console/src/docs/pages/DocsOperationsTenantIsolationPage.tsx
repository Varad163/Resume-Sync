export function DocsOperationsTenantIsolationPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>Tenant Isolation Deep Dive</h2>
        <p>
          Enterprise security requires absolute isolation of customer data. IronBastion achieves this through a multi-layered tenant isolation architecture.
        </p>
      </section>

      <section className="docs-section">
        <h2>Isolation Layers</h2>
        <div style={{ padding: "16px", background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)", fontFamily: "monospace", fontSize: "12px", lineHeight: "1.8", color: "var(--text-main)", textAlign: "center" }}>
          Tenant &rarr; Authenticated Identity &rarr; tenant_id &rarr; Tenant-Scoped Repositories &rarr; PostgreSQL RLS
        </div>

        <ul style={{ marginTop: "20px" }}>
          <li><b>JWT Claim Verification</b>: Fastify auth middleware verifies incoming JWTs and extracts <code>custom:tenant_id</code> into the request principal object.</li>
          <li><b>Transactional RLS Context</b>: Every database query is executed inside <code>runInTenantTransaction</code>, which sets <code>ironbastion.current_tenant_id</code> for the session transaction.</li>
          <li><b>PostgreSQL Row-Level Policies</b>: PostgreSQL enforces RLS policies on <code>projects</code>, <code>scans</code>, <code>findings</code>, <code>artefacts</code>, <code>github_installations</code>, and <code>audit_log</code> tables. Queries attempting to read or write rows belonging to a different tenant fail at the database engine level.</li>
        </ul>
      </section>
    </div>
  );
}
