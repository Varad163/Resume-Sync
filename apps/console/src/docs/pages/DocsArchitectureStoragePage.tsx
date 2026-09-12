export function DocsArchitectureStoragePage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>Storage &amp; Evidence Architecture</h2>
        <p>
          IronBastion stores structured scan metadata in PostgreSQL and heavy document payloads in S3 storage or local database artefact blobs.
        </p>
      </section>

      <section className="docs-section">
        <h2>Artefact Kinds</h2>
        <ul>
          <li><code>cbom</code>: CycloneDX 1.6 Cryptographic Bill of Materials JSON document.</li>
          <li><code>inventory</code>: Discovered cryptographic asset summary.</li>
          <li><code>agent-traces</code>: Step-by-step LLM tool call logs, prompt tokens, and turn decisions.</li>
          <li><code>collector-runs</code>: Static collector execution metrics, file scan counts, and timing data.</li>
        </ul>
      </section>
    </div>
  );
}
