export function DocsDevelopmentLocalPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>Local Development Setup</h2>
        <p>Run IronBastion locally for development and testing:</p>

        <h3>1. Install Dependencies</h3>
        <div className="docs-code-block">
          <pre>{`npm install`}</pre>
        </div>

        <h3>2. Start Local Development Servers</h3>
        <div className="docs-code-block">
          <pre>{`npm run dev`}</pre>
        </div>

        <h3>Local Services &amp; Ports</h3>
        <div className="docs-table-wrapper">
          <table className="docs-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>URL</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>Console UI</b></td>
                <td><code>http://localhost:5199</code></td>
                <td>Vite dev server for single-page dashboard and docs interface.</td>
              </tr>
              <tr>
                <td><b>REST API</b></td>
                <td><code>http://localhost:8787</code></td>
                <td>Fastify API server with in-memory database and SQS/queue support.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
