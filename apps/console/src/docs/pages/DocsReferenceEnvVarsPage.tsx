export function DocsReferenceEnvVarsPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>Environment Variables Reference</h2>
        <p>
          Configuration parameters for API, Worker, CLI, and Infrastructure services.
        </p>
      </section>

      <section className="docs-section">
        <table className="docs-table" style={{ width: "100%", borderCollapse: "collapse", marginTop: "16px" }}>
          <thead>
            <tr style={{ background: "var(--bg-card)", textAlign: "left" }}>
              <th style={{ padding: "10px", border: "1px solid var(--border)" }}>Variable</th>
              <th style={{ padding: "10px", border: "1px solid var(--border)" }}>Required (Prod)?</th>
              <th style={{ padding: "10px", border: "1px solid var(--border)" }}>Example / Format</th>
              <th style={{ padding: "10px", border: "1px solid var(--border)" }}>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>IRONBASTION_AUTH</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>No</td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>dev</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Enables local dev token mode. Must NOT be set in production.</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>COGNITO_USER_POOL_ID</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Yes</td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>us-east-1_example</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>AWS Cognito User Pool ID for JWT validation.</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>COGNITO_CLIENT_ID</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Yes</td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>1234567890abcdef</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>AWS Cognito App Client ID for token audience verification.</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>AWS_REGION</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Yes</td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>us-east-1</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>AWS region for Bedrock, KMS, SQS, and S3 SDK calls.</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>GITHUB_APP_ID</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>No</td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>123456</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Numerical ID of configured GitHub App.</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>GITHUB_APP_PRIVATE_KEY</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>No</td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>PEM string</td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>GitHub App RSA private key for JWT token signing.</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>CERTIFY_KMS_KEY_ARN</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>No</td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>arn:aws:kms:us-east-1:1234:key/...</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>AWS KMS Key ARN for production CERTIFY RSA-2048 signing.</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>SCAN_QUEUE_URL</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Yes (Prod)</td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>https://sqs.us-east-1.amazonaws.com/...</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>AWS SQS scan job queue URL.</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>ARTEFACT_BUCKET</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Yes (Prod)</td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>ironbastion-artefacts-prod</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>AWS S3 bucket name for CBOM and report storage.</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
