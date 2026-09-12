export function DocsIntegrationsZipPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>ZIP Upload Scanning</h2>
        <p>
          The <b>ZIP Upload</b> integration allows security teams to scan standalone codebases, legacy offline projects, or vendor packages without connecting a remote Git repository.
        </p>
      </section>

      <section className="docs-section">
        <h2>Upload Workflow &amp; Constraints</h2>
        <ul>
          <li><b>When to Use</b>: Offline code inspection, proprietary third-party archives, pre-release zip packages.</li>
          <li><b>Upload Limits</b>: Maximum upload size is strictly capped at <b>50 MB</b> (<code>MAX_ZIP_UPLOAD_BYTES = 50 * 1024 * 1024</code>).</li>
          <li><b>Extraction Limits</b>: Maximum uncompressed entry limit is capped at 10,000 files or 500 MB total uncompressed size.</li>
          <li><b>Supported File Types</b>: Must end with <code>.zip</code> and carry valid PK zip header magic bytes.</li>
        </ul>
      </section>

      <section className="docs-section">
        <h2>Security Protections (Zip Slip &amp; Traversal)</h2>
        <p>IronBastion applies rigorous archive extraction security checks before processing any file:</p>
        <ul>
          <li><b>Path Traversal Guard</b>: <code>extractZipSafely</code> verifies every entry path using <code>path.relative()</code> to prevent directory traversal attacks (Zip Slip).</li>
          <li><b>Symlink Escape Prevention</b>: Rejects symbolic links targeting parent directories or absolute system paths.</li>
          <li><b>Ephemeral Cleanup</b>: Uploaded archives and extracted directories are deleted immediately after scan campaign completion or upon extraction failure.</li>
        </ul>
      </section>

      <section className="docs-section">
        <h2>API Endpoints</h2>
        <div style={{ padding: "12px", background: "var(--bg-card)", borderRadius: "6px", border: "1px solid var(--border)", fontFamily: "monospace", fontSize: "13px" }}>
          POST /v1/projects/:projectId/scans/upload (multipart/form-data)
        </div>
      </section>
    </div>
  );
}
