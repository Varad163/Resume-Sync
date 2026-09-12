export function DocsOperationsMonitoringPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>Operations &amp; Monitoring</h2>
        <p>
          Operational health is monitored using AWS CloudWatch metrics, Fastify logging, SQS queue depth tracking, and Watchtower background polling.
        </p>
      </section>

      <section className="docs-section">
        <h2>Monitored Operational Metrics</h2>
        <ul>
          <li><b>API Health Check</b>: Fastify <code>GET /health</code> endpoint returns server uptime and database connectivity.</li>
          <li><b>SQS Queue Depth</b>: CloudWatch alarm alerts when <code>ApproximateNumberOfMessagesVisible</code> exceeds threshold.</li>
          <li><b>DLQ Alarms</b>: Alerts immediately if any message arrives on the SQS Dead Letter Queue.</li>
          <li><b>Watchtower Commit Polling</b>: Background checks track monitored project HEAD SHAs to discover newly pushed commits.</li>
        </ul>
      </section>
    </div>
  );
}
