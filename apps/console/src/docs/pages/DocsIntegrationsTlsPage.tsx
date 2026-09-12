export function DocsIntegrationsTlsPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>TLS Endpoint Probing</h2>
        <p>
          The <b>TLS Probe Collector</b> inspects live network services over TLS to audit supported cipher suites, certificate signature algorithms, key lengths, and handshake parameters.
        </p>
      </section>

      <section className="docs-section">
        <h2>What TLS Detection Probes</h2>
        <ul>
          <li><b>TLS Handshake Protocol</b>: Detects protocol version (e.g. TLS 1.0, TLS 1.1, TLS 1.2, TLS 1.3).</li>
          <li><b>Negotiated Cipher Suite</b>: Extracts cipher suites such as <code>ECDHE-RSA-AES128-GCM-SHA256</code> or <code>TLS_AES_256_GCM_SHA384</code>.</li>
          <li><b>Key Exchange Curve &amp; DH Params</b>: Resolves elliptic curves (e.g. <code>secp256r1</code>, <code>x25519</code>) and finite field Diffie-Hellman parameters.</li>
          <li><b>Server Certificate</b>: Decodes ASN.1 OIDs to extract public key type (RSA vs ECDSA), key size (e.g. 2048-bit vs 4096-bit), signature algorithm, and expiration date.</li>
        </ul>
      </section>

      <section className="docs-section">
        <h2>Target Definition Format</h2>
        <div style={{ padding: "12px", background: "var(--bg-card)", borderRadius: "6px", border: "1px solid var(--border)", fontFamily: "monospace", fontSize: "13px" }}>
{`{
  "kind": "tls-endpoint",
  "id": "target_ep1",
  "host": "api.example.com",
  "port": 443,
  "serverName": "api.example.com"
}`}
        </div>
      </section>
    </div>
  );
}
