export function DocsOutputsCbomPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>Cryptographic Bill of Materials (CBOM)</h2>
        <p>
          A <b>Cryptographic Bill of Materials (CBOM)</b> is an inventory format detailing all cryptographic assets, keys, algorithms, dependencies, and operational parameters in a software project.
        </p>

        <h3>CycloneDX 1.6 Standard</h3>
        <p>
          IronBastion generates fully compliant <b>CycloneDX 1.6 CBOM JSON</b> specifications containing detailed <code>cryptoProperties</code> components.
        </p>

        <h3>Downloading CBOM from a Scan</h3>
        <ol className="docs-step-list">
          <li>Navigate to any completed scan on the Console.</li>
          <li>Click the <b>Download CBOM</b> button in the scan header.</li>
          <li>A JSON payload named <code>ironbastion-&lt;scanId&gt;-cbom.json</code> downloads to your machine.</li>
        </ol>
      </section>
    </div>
  );
}
