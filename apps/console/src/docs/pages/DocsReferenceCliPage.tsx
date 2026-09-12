export function DocsReferenceCliPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>CLI Reference</h2>
        <p>
          Reference manual for the <code>ironbastion scan</code> standalone command.
        </p>
      </section>

      <section className="docs-section">
        <h2>Command Syntax</h2>
        <div style={{ padding: "12px", background: "var(--bg-card)", borderRadius: "6px", border: "1px solid var(--border)", fontFamily: "monospace", fontSize: "13px" }}>
          ironbastion scan &lt;repository-path&gt; [options]
        </div>
      </section>

      <section className="docs-section">
        <h2>Options Summary</h2>
        <ul>
          <li><code>--tls &lt;host[:port]&gt;</code> — Add live TLS endpoint target. Repeatable.</li>
          <li><code>--metadata-only</code> — Exclude source text from LLM agent prompts.</li>
          <li><code>--budget &lt;cents&gt;</code> — Set model spending ceiling in cents (default 50).</li>
          <li><code>--provider &lt;aws|anthropic|deterministic&gt;</code> — Override auto-detected LLM model client.</li>
          <li><code>--json &lt;file&gt;</code> — Save complete report output to JSON file.</li>
          <li><code>--cbom &lt;file&gt;</code> — Export CycloneDX 1.6 CBOM to JSON file.</li>
          <li><code>--quiet</code> — Silence stdout/stderr progress logs.</li>
        </ul>
      </section>
    </div>
  );
}
