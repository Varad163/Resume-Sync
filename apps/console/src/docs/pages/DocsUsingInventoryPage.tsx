export function DocsUsingInventoryPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>Cryptographic Inventory</h2>
        <p>
          The <b>Cryptographic Inventory</b> view presents a complete catalog of all cryptographic assets discovered across your software estate—regardless of whether they are quantum-vulnerable or safe.
        </p>
      </section>

      <section className="docs-section">
        <h2>What Constitutes a Crypto Asset?</h2>
        <p>
          A cryptographic asset in IronBastion represents an active cryptographic algorithm, key length, cipher suite, or library dependency confirmed to exist in your application's executable source code or manifest declarations.
        </p>

        <table className="docs-table" style={{ width: "100%", borderCollapse: "collapse", marginTop: "16px" }}>
          <thead>
            <tr style={{ background: "var(--bg-card)", textAlign: "left" }}>
              <th style={{ padding: "10px", border: "1px solid var(--border)" }}>Asset Field</th>
              <th style={{ padding: "10px", border: "1px solid var(--border)" }}>Example Values</th>
              <th style={{ padding: "10px", border: "1px solid var(--border)" }}>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><b>Algorithm</b></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>RSA-2048</code>, <code>AES-256-GCM</code>, <code>ML-KEM-768</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Canonical algorithm name.</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><b>Primitive</b></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>pke</code>, <code>signature</code>, <code>block-cipher</code>, <code>hash</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>CycloneDX primitive classification.</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><b>Source Location</b></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>src/main/java/com/acme/Crypto.java:42</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>Exact file and line where asset was detected.</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><b>Provenance</b></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>jvm-source</code>, <code>npm-deps</code>, <code>tls-probe</code></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>The static collector that identified the candidate.</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
