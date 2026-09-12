export function DocsArchitectureSystemPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>System Architecture &amp; Monorepo Structure</h2>
        <p>
          IronBastion is structured as a TypeScript monorepo combining core libraries, background worker services, REST API servers, CDK infrastructure stacks, and a React management console.
        </p>
      </section>

      <section className="docs-section">
        <h2>Monorepo Layout</h2>
        <table className="docs-table" style={{ width: "100%", borderCollapse: "collapse", marginTop: "16px" }}>
          <thead>
            <tr style={{ background: "var(--bg-card)", textAlign: "left" }}>
              <th style={{ padding: "10px", border: "1px solid var(--border)" }}>Package / App</th>
              <th style={{ padding: "10px", border: "1px solid var(--border)" }}>Path</th>
              <th style={{ padding: "10px", border: "1px solid var(--border)" }}>Responsibility</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><b>@ironbastion/core</b></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>packages/core</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Domain types, CERTIFY signature helpers, Watchtower diff engine, algorithm registry.</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><b>@ironbastion/db</b></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>packages/db</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Database drivers (PGLite / PostgreSQL), RLS tenant wrappers, schema migrations, repositories.</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><b>@ironbastion/collectors</b></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>packages/collectors</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Static analysis collectors (JVM, Python, JS/TS, NPM, PyPI, TLS probe).</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><b>@ironbastion/agents</b></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>packages/agents</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>SENTINEL, ORACLE, ATLAS, MIGRATE LLM agents, campaign orchestrator, deterministic fallbacks.</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><b>@ironbastion/risk</b></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>packages/risk</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Deterministic quantum risk score calculation engine &amp; migration difficulty estimators.</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><b>@ironbastion/runner</b></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>packages/runner</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Git checkout runner, Zip Slip safe extractor, S3 artefact storage, remote head resolver.</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><b>@ironbastion/cbom</b></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>packages/cbom</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>CycloneDX 1.6 CBOM builder &amp; mapping serializers.</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><b>API App</b></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>apps/api</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Fastify REST HTTP server, Cognito auth middleware, API routes, HTML report renderer.</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><b>Worker App</b></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>apps/worker</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Asynchronous scan daemon polling SQS queues and running scan campaigns.</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><b>Console App</b></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>apps/console</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Vite + React single-page enterprise management web application.</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
