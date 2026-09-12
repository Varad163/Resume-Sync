export function DocsArchitecturePipelinePage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>Scan Pipeline Data Flow</h2>
        <p>
          The <b>Scan Pipeline</b> coordinates data flow between the API server, SQS queue, worker tasks, static collectors, AI agent engine, and database storage.
        </p>
      </section>

      <section className="docs-section">
        <h2>Data Flow Sequence</h2>
        <ol>
          <li><b>Scan Creation</b>: User or Watchtower triggers <code>POST /v1/scans</code>. API writes a scan record in PostgreSQL with status <code>queued</code> and enqueues <code>&#123; scanId, tenantId &#125;</code> to AWS SQS.</li>
          <li><b>Worker Dequeue</b>: Fargate worker polls SQS queue, sets scan status to <code>running</code>, and begins target resolution.</li>
          <li><b>Checkout &amp; Collection</b>: Target repositories are checked out to <code>/tmp/ironbastion-*</code> using GitHub installation access tokens. Static collectors extract candidates.</li>
          <li><b>Adjudication &amp; Risk Scoring</b>: <code>SENTINEL</code> confirms findings; <code>ORACLE</code> assesses exposure; risk engine calculates 0–100 posture score.</li>
          <li><b>Synthesis &amp; Persist</b>: <code>ATLAS</code> builds CBOM; <code>MIGRATE</code> generates waves; worker writes findings to DB, uploads JSON artefacts to S3, deletes SQS message, and purges temporary files.</li>
        </ol>
      </section>
    </div>
  );
}
