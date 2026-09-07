export function DocsScanningZipPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>ZIP Upload Scanning Workflow</h2>
        <p>
          ZIP upload scanning allows security analysts to scan standalone project archives without linking a GitHub account or configuring remote Git URLs.
        </p>

        <ol className="docs-step-list">
          <li>Open <b>+ Add Repository</b> modal in Console.</li>
          <li>Select the <b>Upload ZIP</b> tab.</li>
          <li>Click or drag your project archive (e.g. <code>legacy-payments.zip</code>).</li>
          <li>Click <b>Upload and Start Scan</b>.</li>
          <li>The API streams the multipart file, validates the archive, extracts files to an ephemeral workspace, and executes the scanner.</li>
        </ol>
      </section>

      <section className="docs-section">
        <h2>Built-in Archive Protections</h2>
        <p>IronBastion enforces security validation on all ZIP uploads:</p>

        <div className="docs-cards-grid">
          <div className="docs-card">
            <h3>🔒 Zip-Slip Protection</h3>
            <p>Sanitizes entry paths to prevent directory traversal attacks (e.g. <code>../../etc/passwd</code>).</p>
          </div>
          <div className="docs-card">
            <h3>📦 Size &amp; Rate Limits</h3>
            <p>Enforces a 50MB archive payload limit and maximum file extraction limits.</p>
          </div>
          <div className="docs-card">
            <h3>🧹 Ephemeral Extraction</h3>
            <p>Unpacks code into temporary workspace folders that are purged immediately after scan completion.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
