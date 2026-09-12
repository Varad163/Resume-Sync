export function DocsArchitectureAwsPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>AWS Infrastructure Architecture</h2>
        <p>
          IronBastion's cloud deployment is managed via AWS CDK (<code>infra/lib/platform-stack.ts</code>), defining a secure, highly available serverless container architecture.
        </p>
      </section>

      <section className="docs-section">
        <h2>Architecture Diagram</h2>

        <div style={{ padding: "20px", background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)", fontFamily: "monospace", fontSize: "12px", lineHeight: "1.7", color: "var(--text-main)", margin: "20px 0", overflowX: "auto" }}>
          CloudFront CDN (HTTPS)<br />
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│<br />
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;▼<br />
          Application Load Balancer (ALB)<br />
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│<br />
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├───────────────────────────────┐<br />
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;▼                               ▼<br />
          API Service (Fargate Tasks)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Worker Service (Fargate Tasks)<br />
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│                               ▲<br />
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├───────────────┐               │<br />
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;▼               ▼               │<br />
          Aurora PostgreSQL   SQS Scan Queue ─────┘<br />
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│               │<br />
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;▼               ▼<br />
          AWS KMS (RSA)    SQS Dead Letter Queue (DLQ)<br />
        </div>
      </section>

      <section className="docs-section">
        <h2>AWS Component Responsibilities</h2>
        <table className="docs-table" style={{ width: "100%", borderCollapse: "collapse", marginTop: "16px" }}>
          <thead>
            <tr style={{ background: "var(--bg-card)", textAlign: "left" }}>
              <th style={{ padding: "10px", border: "1px solid var(--border)" }}>AWS Component</th>
              <th style={{ padding: "10px", border: "1px solid var(--border)" }}>Purpose</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><b>CloudFront &amp; ALB</b></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>HTTPS termination, edge caching, and load balancing to ECS tasks.</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><b>ECS Fargate API</b></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Runs stateless Fastify API containers in VPC private isolated subnets.</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><b>ECS Fargate Worker</b></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Asynchronous scan execution tasks polling SQS queues.</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><b>SQS &amp; DLQ</b></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Scan job queue with Dead Letter Queue (maxReceiveCount: 3, 14-day retention).</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><b>Aurora Serverless v2</b></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>PostgreSQL relational cluster with storage encryption and 14-day automated backups.</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><b>AWS KMS (CertifyKey)</b></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Asymmetric RSA-2048 signing key pair for CERTIFY attestations.</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><b>S3 (ArtefactBucket)</b></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Blob storage for CycloneDX CBOM files, agent traces, and report artefacts.</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
