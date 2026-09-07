export function DocsAnalysisInventoryPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>Cryptographic Inventory</h2>
        <p>
          The <b>Inventory</b> tab answers the core question: <i>"What cryptographic algorithms, keys, and dependencies exist in this repository?"</i>
        </p>
        <p>
          Unlike simple dependency vulnerability scanners, IronBastion catalogues actual cryptographic usage regardless of whether an algorithm is currently secure, weak, or quantum-vulnerable.
        </p>

        <h3>Discovered Primitive Categories</h3>
        <div className="docs-cards-grid">
          <div className="docs-card">
            <h3>🔑 Asymmetric Cryptography</h3>
            <p>RSA-1024/2048/4096, ECDSA, ECDH (secp256k1, prime256v1, Ed25519), DSA.</p>
          </div>
          <div className="docs-card">
            <h3>🔒 Symmetric Encryption</h3>
            <p>AES-128, AES-256 (CBC, GCM, CTR), 3DES, DES, Blowfish, RC4.</p>
          </div>
          <div className="docs-card">
            <h3>HASH Cryptographic Hashing</h3>
            <p>SHA-256, SHA-384, SHA-512, SHA-1, MD5, RIPEMD160.</p>
          </div>
          <div className="docs-card">
            <h3>🌐 TLS Protocols</h3>
            <p>TLS 1.2, TLS 1.3, TLS 1.3 Hybrid, SSLv3.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
