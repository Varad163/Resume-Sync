export function DocsOperationsAuditLogsPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>Audit Logs &amp; Activity Tracking</h2>
        <p>
          IronBastion records an immutable audit log for every administrative, configuration, and scan action taken within a tenant workspace.
        </p>
      </section>

      <section className="docs-section">
        <h2>Audit Log Record Structure</h2>
        <ul>
          <li><b>Actor</b>: Email or user principal who initiated the action (e.g. <code>user@example.com</code>).</li>
          <li><b>Action</b>: Action identifier (e.g. <code>scan.create</code>, <code>scan.upload</code>, <code>scan.trigger_monitor</code>, <code>project.create</code>).</li>
          <li><b>Subject</b>: Affected resource ID (e.g. <code>scan_xyz123</code>, <code>prj_abc456</code>).</li>
          <li><b>Timestamp</b>: UTC ISO 8601 timestamp.</li>
          <li><b>Detail</b>: JSON object carrying non-sensitive operation context.</li>
        </ul>
      </section>

      <section className="docs-section">
        <h2>API Query</h2>
        <div style={{ padding: "12px", background: "var(--bg-card)", borderRadius: "6px", border: "1px solid var(--border)", fontFamily: "monospace", fontSize: "13px" }}>
          GET /v1/audit/activity?limit=50
        </div>
      </section>
    </div>
  );
}
