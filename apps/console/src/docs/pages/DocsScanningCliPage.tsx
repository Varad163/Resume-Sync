export function DocsScanningCliPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>IronBastion CLI Scanner</h2>
        <p>
          The IronBastion CLI (<code>@ironbastion/cli</code>) allows developers to execute static cryptographic scans directly on their local workstations or inside CI/CD build scripts.
        </p>

        <h3>Basic Local Repository Scan</h3>
        <div className="docs-code-block">
          <pre>{`npm run scan -- /path/to/local/repository`}</pre>
        </div>

        <h3>TLS Endpoint &amp; CBOM Output Scan</h3>
        <div className="docs-code-block">
          <pre>{`npm run scan -- /path/to/local/repository --tls api.example.com:443 --cbom cbom.json`}</pre>
        </div>
      </section>

      <section className="docs-section">
        <h2>CLI Capabilities</h2>
        <ul className="docs-list">
          <li>Runs deterministic collectors on JVM, JavaScript, TypeScript, Python, and package manifests.</li>
          <li>Optionally probes live TLS endpoints for active handshake cipher suites and certificate chains.</li>
          <li>Outputs human-readable terminal summaries with posture scores, confirmed findings, and migration wave totals.</li>
          <li>Generates standardized CycloneDX 1.6 CBOM JSON payloads locally without exposing source code.</li>
        </ul>
      </section>
    </div>
  );
}
