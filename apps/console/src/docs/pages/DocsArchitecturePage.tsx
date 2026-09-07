export function DocsArchitecturePage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>Monorepo Platform Architecture</h2>
        <p>
          IronBastion is built as a TypeScript monorepo using npm workspaces, separating core engine logic into decoupled packages and apps.
        </p>

        <h3>Packages &amp; Applications Map</h3>
        <div className="docs-table-wrapper">
          <table className="docs-table">
            <thead>
              <tr>
                <th>Path</th>
                <th>Kind</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>packages/core</code></td>
                <td>Package</td>
                <td>Domain types, scan records, certificates, and migration simulator logic.</td>
              </tr>
              <tr>
                <td><code>packages/collectors</code></td>
                <td>Package</td>
                <td>Static AST and source code collectors (JVM, Node, Python, TLS).</td>
              </tr>
              <tr>
                <td><code>packages/agents</code></td>
                <td>Package</td>
                <td>Agentic AI subagents (Sentinel, Oracle, Atlas, Migrate).</td>
              </tr>
              <tr>
                <td><code>packages/cbom</code></td>
                <td>Package</td>
                <td>CycloneDX 1.6 CBOM schema, generator, and validators.</td>
              </tr>
              <tr>
                <td><code>packages/risk</code></td>
                <td>Package</td>
                <td>Deterministic quantum vulnerability risk scoring engine.</td>
              </tr>
              <tr>
                <td><code>packages/runner</code></td>
                <td>Package</td>
                <td>Scan pipeline execution, checkout, and SQS/memory queue abstraction.</td>
              </tr>
              <tr>
                <td><code>packages/db</code></td>
                <td>Package</td>
                <td>Better-SQLite3 / Postgres database repositories and SQL schema migrations.</td>
              </tr>
              <tr>
                <td><code>apps/api</code></td>
                <td>Application</td>
                <td>Fastify REST API server, authentication hooks, and route handlers.</td>
              </tr>
              <tr>
                <td><code>apps/console</code></td>
                <td>Application</td>
                <td>Vite + React single-page application dashboard and docs interface.</td>
              </tr>
              <tr>
                <td><code>apps/worker</code></td>
                <td>Application</td>
                <td>Background queue worker for processing asynchronous scans.</td>
              </tr>
              <tr>
                <td><code>apps/cli</code></td>
                <td>Application</td>
                <td>Command-line interface scanner tool.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="docs-section">
        <h2>System Architecture Diagram</h2>
        <div className="docs-flow-diagram">
          <div className="flow-step">
            <div className="step-title">Console / CLI</div>
          </div>
          <div className="flow-arrow">→</div>

          <div className="flow-step">
            <div className="step-title">Fastify API</div>
          </div>
          <div className="flow-arrow">→</div>

          <div className="flow-step">
            <div className="step-title">Queue</div>
          </div>
          <div className="flow-arrow">→</div>

          <div className="flow-step">
            <div className="step-title">Worker</div>
          </div>
          <div className="flow-arrow">→</div>

          <div className="flow-step">
            <div className="step-title">Collectors &amp; Agents</div>
          </div>
          <div className="flow-arrow">→</div>

          <div className="flow-step">
            <div className="step-title">Database Storage</div>
          </div>
        </div>
      </section>
    </div>
  );
}
