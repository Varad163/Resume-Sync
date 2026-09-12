export function DocsOperationsReliabilityPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>Reliability &amp; Fault Tolerance</h2>
        <p>
          IronBastion incorporates multiple fault-tolerance mechanisms to maintain high availability and prevent data loss.
        </p>
      </section>

      <section className="docs-section">
        <h2>Reliability Mechanisms</h2>
        <ul>
          <li><b>Fail-Closed Security Guardrails</b>: If production authentication config is missing or invalid, the API fails fast during startup rather than degrading to unauthenticated mode.</li>
          <li><b>SQS Dead Letter Queue (DLQ)</b>: Job execution failures are retried up to 3 times before being safely sequestered in the DLQ.</li>
          <li><b>Database Transaction Safety</b>: Scan results, posture updates, and CBOM records are committed in atomic transactions. If a step fails, the entire transaction rolls back cleanly.</li>
          <li><b>LLM Fallback to Rules Engine</b>: Offline rules step in whenever model clients experience timeouts or quota limits, guaranteeing scan completion.</li>
        </ul>
      </section>
    </div>
  );
}
