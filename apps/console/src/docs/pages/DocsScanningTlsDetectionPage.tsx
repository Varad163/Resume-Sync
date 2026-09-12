export function DocsScanningTlsDetectionPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>TLS Detection Mechanics</h2>
        <p>
          The <code>tlsProbeCollector</code> establishes non-intrusive TLS socket handshakes to observe protocol negotiations and certificate key parameters.
        </p>
      </section>

      <section className="docs-section">
        <h2>Cipher Suite Decomposition</h2>
        <p>
          Cipher suite strings are decomposed into individual primitive components:
        </p>
        <ul>
          <li><b>Key Exchange</b>: <code>ECDHE</code>, <code>DHE</code>, <code>RSA</code>, <code>PQC-Hybrid</code></li>
          <li><b>Authentication Signature</b>: <code>RSA</code>, <code>ECDSA</code>, <code>ML-DSA-65</code></li>
          <li><b>Bulk Encryption Mode</b>: <code>AES-256-GCM</code>, <code>CHACHA20-POLY1305</code>, <code>AES-128-CBC</code></li>
          <li><b>Message Digest / KDF</b>: <code>SHA256</code>, <code>SHA384</code></li>
        </ul>
      </section>
    </div>
  );
}
