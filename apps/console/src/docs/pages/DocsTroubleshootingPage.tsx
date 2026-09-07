export function DocsTroubleshootingPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>Common Issues &amp; Solutions</h2>

        <div className="docs-faq-stack">
          <div className="faq-item">
            <h3>Q: GitHub repositories do not appear in the dropdown</h3>
            <p>
              <b>Solution:</b> Ensure your GitHub App installation has access to your target repository.
              Click <b>Manage Access</b> on the Integrations page to re-authorize repository permissions.
            </p>
          </div>

          <div className="faq-item">
            <h3>Q: Connecting GitHub opens a 404 page on GitHub</h3>
            <p>
              <b>Solution:</b> Verify that <code>GITHUB_APP_NAME</code> or slug matches your GitHub App configuration on GitHub Developer Settings.
            </p>
          </div>

          <div className="faq-item">
            <h3>Q: Callback error when connecting GitHub</h3>
            <p>
              <b>Solution:</b> Confirm the Callback URL in GitHub settings is set to:
              <code>http://localhost:8787/v1/integrations/github/callback</code>.
            </p>
          </div>

          <div className="faq-item">
            <h3>Q: Scan completed with 0 findings</h3>
            <p>
              <b>Solution:</b> The scanned repository or directory genuinely contains no supported cryptographic primitives (e.g., pure plain text or CSS files).
            </p>
          </div>

          <div className="faq-item">
            <h3>Q: ZIP upload fails with error</h3>
            <p>
              <b>Solution:</b> Check that your archive is a valid <code>.zip</code> file under 50MB and does not contain illegal relative path entries.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
