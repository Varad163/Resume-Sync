export function DocsAnalysisRiskScoringPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>Quantum Vulnerability Scoring Model</h2>
        <p>
          IronBastion computes an objective <b>Posture &amp; Risk Score (0–100)</b> based on deterministic cryptographic evidence rather than arbitrary LLM estimates.
        </p>

        <div className="docs-callout note">
          <b>Key Principle:</b> Risk scores reflect mathematical vulnerability under Shor's algorithm (which breaks RSA and ECC) and Grover's algorithm (which reduces symmetric key entropy), combined with exposure lifetime.
        </div>

        <h3>Severity Thresholds</h3>
        <div className="docs-table-wrapper">
          <table className="docs-table">
            <thead>
              <tr>
                <th>Score Range</th>
                <th>Severity Tier</th>
                <th>Cryptographic Context</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>90 – 100</b></td>
                <td><span className="badge-red">CRITICAL</span></td>
                <td>Classical RSA-1024/2048 or ECDSA/ECDH algorithms vulnerable to Shor's algorithm on CRQCs.</td>
              </tr>
              <tr>
                <td><b>70 – 89</b></td>
                <td><span className="badge-orange">HIGH</span></td>
                <td>Deprecated legacy ciphers (3DES, SHA-1, MD5) or TLS 1.2 static cipher suites.</td>
              </tr>
              <tr>
                <td><b>40 – 69</b></td>
                <td><span className="badge-yellow">MEDIUM</span></td>
                <td>AES-128 (reduced entropy under Grover's algorithm) or short-lived asymmetric tokens.</td>
              </tr>
              <tr>
                <td><b>0 – 39</b></td>
                <td><span className="badge-green">LOW / SAFE</span></td>
                <td>NIST PQC algorithms (ML-KEM, ML-DSA), AES-256-GCM, or SHA-384.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
