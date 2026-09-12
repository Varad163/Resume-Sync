export function DocsUsingProjectsPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>Project Management</h2>
        <p>
          In IronBastion, a <b>Project</b> serves as the primary organizational container for your codebase targets, repositories, and continuous monitoring configurations.
        </p>
      </section>

      <section className="docs-section">
        <h2>Project Features &amp; Capabilities</h2>
        <ul>
          <li><b>Target Aggregation</b>: A project can aggregate multiple target sources, including remote GitHub repositories, manual Git URLs, local disk directories, ZIP upload archives, and live TLS endpoints.</li>
          <li><b>Tenant Isolation</b>: Every project is strictly bound to a tenant ID (<code>tenant_id</code>) and isolated at the database layer via PostgreSQL Row Level Security (RLS).</li>
          <li><b>Monitoring Configuration</b>: Projects track <code>monitoring_enabled</code>, <code>monitoring_interval</code>, and <code>last_monitored_at</code> parameters used by Watchtower.</li>
          <li><b>API Management</b>: Projects can be created via <code>POST /v1/projects</code>, queried via <code>GET /v1/projects</code>, or updated via <code>PUT /v1/projects/:id</code>.</li>
        </ul>
      </section>
    </div>
  );
}
