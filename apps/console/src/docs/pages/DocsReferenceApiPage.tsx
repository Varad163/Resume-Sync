export function DocsReferenceApiPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>REST API Reference</h2>
        <p>
          IronBastion exposes a Fastify REST HTTP API. All endpoints require a <code>Authorization: Bearer &lt;token&gt;</code> header (except local health checks).
        </p>
      </section>

      <section className="docs-section">
        <h2>Projects API</h2>
        <ul>
          <li><code>GET /v1/projects</code> — List all projects for current tenant.</li>
          <li><code>POST /v1/projects</code> — Create a new project container.</li>
          <li><code>GET /v1/projects/:id</code> — Get project details and target definitions.</li>
          <li><code>PUT /v1/projects/:id</code> — Update project targets or name.</li>
          <li><code>DELETE /v1/projects/:id</code> — Delete project and associated scans.</li>
        </ul>
      </section>

      <section className="docs-section">
        <h2>Scans API</h2>
        <ul>
          <li><code>POST /v1/scans</code> — Trigger a new scan run for a project.</li>
          <li><code>GET /v1/scans</code> — List scans filtered by <code>projectId</code>.</li>
          <li><code>GET /v1/scans/:id</code> — Get scan details, posture score, and notes.</li>
          <li><code>GET /v1/scans/:id/findings</code> — List confirmed findings filtered by <code>severity</code>.</li>
          <li><code>POST /v1/scans/upload</code> — Upload a ZIP archive (multipart/form-data, max 50MB) for scanning.</li>
          <li><code>GET /v1/scans/:id/cbom</code> — Download CycloneDX 1.6 CBOM JSON.</li>
          <li><code>GET /v1/scans/:id/report</code> — Render HTML executive security report.</li>
        </ul>
      </section>

      <section className="docs-section">
        <h2>GitHub &amp; Integrations API</h2>
        <ul>
          <li><code>GET /v1/integrations/github/status</code> — Check GitHub App connection status.</li>
          <li><code>GET /v1/integrations/github/install</code> — Get GitHub App OAuth authorization redirect URL.</li>
          <li><code>GET /v1/integrations/github/callback</code> — Process GitHub OAuth callback code.</li>
          <li><code>GET /v1/integrations/github/repositories</code> — List accessible repositories for connected GitHub App installation.</li>
          <li><code>POST /v1/integrations/github/disconnect</code> — Disconnect GitHub App installation.</li>
        </ul>
      </section>

      <section className="docs-section">
        <h2>Watchtower API</h2>
        <ul>
          <li><code>GET /v1/projects/:id/watchtower</code> — Fetch Watchtower differential posture diff history.</li>
          <li><code>POST /v1/projects/:id/monitor</code> — Check remote HEAD SHA and queue scan if updated.</li>
        </ul>
      </section>

      <section className="docs-section">
        <h2>CERTIFY &amp; Audit API</h2>
        <ul>
          <li><code>POST /v1/scans/:id/certify</code> — Generate a signed PQC readiness certificate payload.</li>
          <li><code>GET /v1/scans/:id/certificate</code> — Download existing signed certificate.</li>
          <li><code>GET /v1/certify/public-key</code> — Retrieve RSA-2048 public key for signature verification.</li>
          <li><code>GET /v1/audit/activity</code> — Query tenant administrative audit log.</li>
        </ul>
      </section>
    </div>
  );
}
