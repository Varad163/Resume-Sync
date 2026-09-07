export function DocsDevelopmentTestingPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>Testing &amp; Verification Commands</h2>
        <p>Run these commands to verify code quality and build stability:</p>

        <div className="docs-table-wrapper">
          <table className="docs-table">
            <thead>
              <tr>
                <th>Command</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>npm test</code></td>
                <td>Executes all unit and integration test suites using Vitest.</td>
              </tr>
              <tr>
                <td><code>npm run typecheck</code></td>
                <td>Runs TypeScript compiler check (<code>tsc --noEmit</code>) across monorepo.</td>
              </tr>
              <tr>
                <td><code>npm run lint</code></td>
                <td>Runs ESLint linter check.</td>
              </tr>
              <tr>
                <td><code>npm run console:build</code></td>
                <td>Builds the production bundle for the Console single-page web app.</td>
              </tr>
              <tr>
                <td><code>npm run bundle</code></td>
                <td>Bundles application artifacts for distribution.</td>
              </tr>
              <tr>
                <td><code>npm run synth</code></td>
                <td>Synthesizes AWS CDK CloudFormation templates.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
