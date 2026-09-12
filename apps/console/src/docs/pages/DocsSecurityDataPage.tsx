export function DocsSecurityDataPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>Data Security &amp; Privacy</h2>
        <p>
          IronBastion is designed from the ground up for strict data privacy and zero-retention source code handling.
        </p>
      </section>

      <section className="docs-section">
        <h2>Ephemeral Source Code Handling</h2>
        <ul>
          <li><b>Ephemeral Checkout</b>: Worker nodes clone target Git repositories or extract ZIP archives into temporary directories (<code>/tmp/ironbastion-*</code>).</li>
          <li><b>Immediate Cleanup</b>: As soon as candidate collection completes, the worker forcefully deletes the temporary directory from disk using recursive <code>rm</code>.</li>
          <li><b>Bounded Model Snippets</b>: LLM prompts receive only minimal bounded code snippets (maximum 10–25 lines around detected callsites) required for adjudication. Source code is never retained in prompt history or stored in database tables.</li>
          <li><b>Metadata-Only Option</b>: Organizations with strict compliance requirements can pass <code>--metadata-only</code> or configure <code>metadataOnly: true</code> to strip source code text completely before sending candidates to AI agents.</li>
        </ul>
      </section>
    </div>
  );
}
