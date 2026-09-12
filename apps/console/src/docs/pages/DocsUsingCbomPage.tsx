export function DocsUsingCbomPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>Cryptographic Bill of Materials (CBOM)</h2>
        <p>
          A <b>Cryptographic Bill of Materials (CBOM)</b> is a structured inventory artifact that catalogs every cryptographic algorithm, key length, certificate, protocol, and asset dependency within a software application.
        </p>
      </section>

      <section className="docs-section">
        <h2>CycloneDX 1.6 Specification</h2>
        <p>
          IronBastion generates CBOM files fully compliant with the official <b>CycloneDX 1.6 Specification</b> for cryptographic assets.
        </p>
        <ul>
          <li><b>BOM Format</b>: <code>CycloneDX</code></li>
          <li><b>Spec Version</b>: <code>1.6</code></li>
          <li><b>Component Type</b>: <code>cryptographic-asset</code></li>
          <li><b>Cryptographic Properties</b>: <code>primitive</code>, <code>executionEnvironment</code>, <code>cryptoFunctions</code>, <code>nistQuantumSecurityLevel</code> (0–5).</li>
          <li><b>Occurrences &amp; Evidence</b>: Exact line numbers, code symbols, and locator strings.</li>
        </ul>
      </section>

      <section className="docs-section">
        <h2>Downloading the CBOM</h2>
        <p>
          You can view the CBOM tree directly on the Console <b>CBOM</b> tab or download the raw JSON file via the API:
        </p>
        <div style={{ padding: "12px", background: "var(--bg-card)", borderRadius: "6px", border: "1px solid var(--border)", fontFamily: "monospace", fontSize: "13px" }}>
          GET /v1/scans/:scanId/cbom
        </div>
      </section>
    </div>
  );
}
