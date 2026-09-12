export function DocsSecurityMultiTenancyPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>Multi-Tenancy &amp; Database Isolation</h2>
        <p>
          IronBastion uses a strict multi-tenant architecture to guarantee complete isolation between customer organizations. No tenant can ever view, query, or mutate another tenant's projects, repositories, scans, findings, or certificates.
        </p>
      </section>

      <section className="docs-section">
        <h2>PostgreSQL Row Level Security (RLS)</h2>
        <p>
          Every table in the database schema carries a mandatory <code>tenant_id</code> column linked to the <code>tenants</code> table. Isolation is enforced at the database level using PostgreSQL Row Level Security (RLS):
        </p>

        <div style={{ padding: "12px", background: "var(--bg-card)", borderRadius: "6px", border: "1px solid var(--border)", fontFamily: "monospace", fontSize: "12px", color: "var(--text-main)", whiteSpace: "pre-wrap" }}>
{`-- RLS Policy Enforcement
CREATE POLICY tenant_isolation_policy ON projects
  USING (tenant_id = current_setting('ironbastion.current_tenant_id', true))
  WITH CHECK (tenant_id = current_setting('ironbastion.current_tenant_id', true));`}
        </div>

        <p style={{ marginTop: "16px" }}>
          All database operations run inside <code>runInTenantTransaction(db, tenantId, fn)</code> wrappers, which execute <code>SELECT set_config('ironbastion.current_tenant_id', $1, true)</code> at the start of every transaction.
        </p>
      </section>
    </div>
  );
}
