export function DocsScanningSourceCodePage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>Source Code Scanning</h2>
        <p>
          Source code collectors perform tokenization and pattern matching against executable source files to identify active cryptographic callsites.
        </p>
      </section>

      <section className="docs-section">
        <h2>Documentation Mentions vs Executable Context</h2>
        <div className="callout alert-important" style={{ padding: "16px", background: "rgba(239, 68, 68, 0.08)", borderLeft: "4px solid #EF4444", borderRadius: "4px", marginBottom: "20px" }}>
          <strong>Critical Distinction:</strong> A README file or code comment mentioning <code>AES-256</code> or <code>RSA-2048</code> is NOT automatically classified as a cryptographic asset or vulnerability finding.
        </div>
        <p>
          Static collectors require invocations inside active code blocks (e.g. <code>Cipher.getInstance("RSA/ECB/PKCS1Padding")</code>, <code>crypto.createCipheriv("aes-128-cbc", key, iv)</code>). Furthermore, the <code>SENTINEL</code> agent filters out comment text, markdown files, and test fixtures during adjudication.
        </p>
      </section>

      <section className="docs-section">
        <h2>Zero-Crypto Result Behaviors</h2>
        <ul>
          <li><b>No Cryptographic Usage Detected</b>: The scanner found no cryptographic callsites or dependencies. Posture score is 0.</li>
          <li><b>Crypto Usage Detected, 0 Quantum Vulnerabilities</b>: Cryptography is active (e.g. <code>AES-256-GCM</code>, <code>SHA-256</code>, <code>ML-KEM-768</code>), but no quantum-vulnerable algorithms exist. Posture score remains low/safe.</li>
          <li><b>Confirmed Quantum Vulnerabilities</b>: Active callsites use quantum-broken algorithms (e.g. <code>RSA-2048</code>, <code>ECDSA-P256</code>, <code>SHA-1</code> signature path), raising posture score and triggering remediation findings.</li>
        </ul>
      </section>
    </div>
  );
}
