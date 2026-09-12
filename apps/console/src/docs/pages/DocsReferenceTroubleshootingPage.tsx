export function DocsReferenceTroubleshootingPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>Troubleshooting &amp; Diagnostics</h2>
        <p>
          Practical solutions for common configuration, authentication, GitHub integration, and scanning issues.
        </p>
      </section>

      <section className="docs-section">
        <h2>Common Diagnostic Scenarios</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ padding: "16px", background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "15px", color: "var(--text-main)", marginTop: 0 }}>1. GitHub shows installed but IronBastion says "Not Connected"</h3>
            <p><b>Possible Cause:</b> Callback URL mismatch or missing <code>GITHUB_APP_PRIVATE_KEY</code> on API process.</p>
            <p><b>Diagnosis:</b> Inspect API logs for <code>GitHub installation callback failed</code> or missing private key errors.</p>
            <p><b>Fix:</b> Confirm <code>GITHUB_APP_ID</code> and <code>GITHUB_APP_PRIVATE_KEY</code> are correctly set in the API container environment and match the GitHub App setting.</p>
          </div>

          <div style={{ padding: "16px", background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "15px", color: "var(--text-main)", marginTop: 0 }}>2. GitHub repository not appearing in selection dropdown</h3>
            <p><b>Possible Cause:</b> The GitHub App was installed with "Selected Repositories" access and the new repository was not granted access.</p>
            <p><b>Diagnosis:</b> Open GitHub App installation settings in GitHub.</p>
            <p><b>Fix:</b> Under <b>Repository access</b>, add the repository to the permitted list, then click <b>Save</b>.</p>
          </div>

          <div style={{ padding: "16px", background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "15px", color: "var(--text-main)", marginTop: 0 }}>3. Scan completes with 0 findings</h3>
            <p><b>Possible Cause:</b> The repository contains no quantum-broken algorithms or uses modern safe PQC algorithms exclusively.</p>
            <p><b>Diagnosis:</b> Check the <b>Cryptographic Inventory</b> tab. If crypto assets exist, the code is safe! If 0 crypto assets exist, verify target path.</p>
            <p><b>Fix:</b> Ensure source files are not excluded by custom ignore rules.</p>
          </div>

          <div style={{ padding: "16px", background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "15px", color: "var(--text-main)", marginTop: 0 }}>4. Scan completes with 0 crypto assets</h3>
            <p><b>Possible Cause:</b> Unrecognized programming language or missing supported manifest files.</p>
            <p><b>Diagnosis:</b> Review collector run logs on the Scan Details page.</p>
            <p><b>Fix:</b> Verify project contains Java/Kotlin, Python, JS/TS, or manifest files (pom.xml, package.json, requirements.txt).</p>
          </div>

          <div style={{ padding: "16px", background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "15px", color: "var(--text-main)", marginTop: 0 }}>5. CBOM download requires authentication</h3>
            <p><b>Possible Cause:</b> Session bearer token expired before downloading.</p>
            <p><b>Diagnosis:</b> Check browser console network tab for HTTP 401 Unauthorized.</p>
            <p><b>Fix:</b> Re-authenticate in the Console UI before requesting <code>GET /v1/scans/:id/cbom</code>.</p>
          </div>

          <div style={{ padding: "16px", background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "15px", color: "var(--text-main)", marginTop: 0 }}>6. Scan stuck in "queued" or "running" state</h3>
            <p><b>Possible Cause:</b> Worker service daemon is offline or SQS queue visibility timeout expired.</p>
            <p><b>Diagnosis:</b> Inspect worker task container status and SQS <code>ApproximateNumberOfMessagesVisible</code>.</p>
            <p><b>Fix:</b> Ensure worker ECS task service is running and connected to <code>SCAN_QUEUE_URL</code>.</p>
          </div>

          <div style={{ padding: "16px", background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "15px", color: "var(--text-main)", marginTop: 0 }}>7. Watchtower says "up-to-date"</h3>
            <p><b>Possible Cause:</b> Remote repository HEAD commit SHA has not changed since the last completed scan.</p>
            <p><b>Diagnosis:</b> Run <code>git rev-parse HEAD</code> on remote repo.</p>
            <p><b>Fix:</b> Watchtower automatically skips redundant scans when commit SHA matches. Push a new commit to trigger a re-scan.</p>
          </div>

          <div style={{ padding: "16px", background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "15px", color: "var(--text-main)", marginTop: 0 }}>8. CERTIFY certificate generation failure</h3>
            <p><b>Possible Cause:</b> Invalid <code>CERTIFY_KMS_KEY_ARN</code> or missing IAM <code>kms:Sign</code> permission on ECS task role.</p>
            <p><b>Diagnosis:</b> Inspect API log for <code>KMS signing response carried no signature</code>.</p>
            <p><b>Fix:</b> Grant <code>kms:Sign</code> and <code>kms:GetPublicKey</code> permissions to Fargate Task Role in CDK or IAM console.</p>
          </div>

          <div style={{ padding: "16px", background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "15px", color: "var(--text-main)", marginTop: 0 }}>9. Cognito login failure</h3>
            <p><b>Possible Cause:</b> Mismatched <code>COGNITO_USER_POOL_ID</code>, <code>COGNITO_CLIENT_ID</code>, or region configuration.</p>
            <p><b>Diagnosis:</b> Inspect browser network response for JWKS issuer errors.</p>
            <p><b>Fix:</b> Ensure <code>COGNITO_USER_POOL_ID</code> matches AWS console User Pool ID.</p>
          </div>

          <div style={{ padding: "16px", background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "15px", color: "var(--text-main)", marginTop: 0 }}>10. AWS CDK deployment failure</h3>
            <p><b>Possible Cause:</b> Unbootstrapped AWS environment or invalid credentials.</p>
            <p><b>Diagnosis:</b> Inspect <code>cdk deploy</code> terminal log output.</p>
            <p><b>Fix:</b> Run <code>npx cdk bootstrap aws://ACCOUNT-NUMBER/REGION</code> before running <code>npm run deploy</code>.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
