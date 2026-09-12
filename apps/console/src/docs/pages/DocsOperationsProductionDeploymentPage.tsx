export function DocsOperationsProductionDeploymentPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>Production Deployment Guide</h2>
        <p>
          This guide outlines the prerequisites, commands, and verification steps for deploying IronBastion to AWS production environments.
        </p>
      </section>

      <section className="docs-section">
        <h2>Deployment Prerequisites</h2>
        <ul>
          <li><b>AWS Credentials</b>: Active AWS CLI credentials with permissions to deploy CloudFormation stacks via AWS CDK.</li>
          <li><b>Node.js &amp; npm</b>: Node.js &gt;= 22.x installed on deploy host.</li>
          <li><b>Cognito User Pool</b>: Provisioned AWS Cognito User Pool with <code>COGNITO_USER_POOL_ID</code> and <code>COGNITO_CLIENT_ID</code>.</li>
          <li><b>Anthropic Workspace</b>: Access ARN for Claude models on AWS Bedrock or Anthropic API key.</li>
        </ul>
      </section>

      <section className="docs-section">
        <h2>Build &amp; Deployment Commands</h2>
        <div style={{ padding: "12px", background: "var(--bg-card)", borderRadius: "6px", border: "1px solid var(--border)", fontFamily: "monospace", fontSize: "12px", whiteSpace: "pre-wrap" }}>
{`# 1. Install workspace dependencies
npm install

# 2. Execute static typechecking and linting
npm run typecheck
npm run lint

# 3. Run full automated test suite
npm test

# 4. Build API, Worker, and Console production bundles
npm run bundle
npm run console:build

# 5. Synthesize CDK CloudFormation stack
npm run synth

# 6. Deploy to AWS
npm run deploy`}
        </div>
      </section>

      <section className="docs-section">
        <h2>Verification Matrix (Code vs Runtime)</h2>
        <div className="callout alert-warning" style={{ padding: "16px", background: "rgba(245, 158, 11, 0.08)", borderLeft: "4px solid #F59E0B", borderRadius: "4px", marginBottom: "20px" }}>
          <strong>Important Distinction:</strong> Code-level verification (passing unit tests, clean typecheck, CDK synth) confirms application correctness. Actual AWS runtime verification requires deploying the CloudFormation stack to your AWS environment and testing live endpoints.
        </div>
      </section>
    </div>
  );
}
