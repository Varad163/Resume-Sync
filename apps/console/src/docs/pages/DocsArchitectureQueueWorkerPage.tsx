export function DocsArchitectureQueueWorkerPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>Queue &amp; Worker Architecture</h2>
        <p>
          The background worker daemon (<code>apps/worker</code>) decouples scan request processing from HTTP API execution using AWS SQS queue polling.
        </p>
      </section>

      <section className="docs-section">
        <h2>Reliability &amp; Shutdown Controls</h2>
        <ul>
          <li><b>Graceful Shutdown (<code>SIGINT</code>/<code>SIGTERM</code>)</b>: When a termination signal is received, the worker finishes active scans before shutting down.</li>
          <li><b>Transactional Completion</b>: SQS messages are deleted from the queue ONLY AFTER all scan findings, CBOMs, and posture records are safely committed to PostgreSQL.</li>
          <li><b>Dead Letter Queue (DLQ)</b>: Poisoned scan jobs failing 3 consecutive times are moved to the SQS DLQ for diagnostic inspection.</li>
        </ul>
      </section>
    </div>
  );
}
