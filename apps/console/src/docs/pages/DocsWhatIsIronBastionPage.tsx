export function DocsWhatIsIronBastionPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>What Problem Does IronBastion Solve?</h2>
        <p>
          Modern software platforms rely heavily on public-key cryptography (such as RSA, Diffie-Hellman, and ECDSA) for identity verification, TLS transport security, digital signatures, and data encryption at rest. However, quantum computers equipped with sufficient fault-tolerant qubits will be capable of running <b>Shor's algorithm</b>, which efficiently factors large integers and calculates discrete logarithms in polynomial time.
        </p>
        <p>
          This poses an immediate risk known as <b>Harvest-Now, Decrypt-Later (HNDL)</b>: adversary nation-states and malicious actors can record encrypted network traffic today and decrypt it once cryptographically relevant quantum computers become operational.
        </p>
      </section>

      <section className="docs-section">
        <h2>Why Cryptographic Inventory Matters</h2>
        <p>
          Most organization security tools scan for open-source CVEs or code quality bugs, but fail to detect where cryptographic primitives are instantiated, which key lengths are configured, how long protected data remains sensitive, or whether algorithms are vulnerable to quantum decryption.
        </p>
        <p>
          Without an accurate, continuous <b>Cryptographic Bill of Materials (CBOM)</b>, organizations cannot plan effective post-quantum migrations or demonstrate compliance to regulators and auditors.
        </p>
      </section>

      <section className="docs-section">
        <h2>Who IronBastion Is Designed For</h2>
        <ul>
          <li><b>Chief Information Security Officers (CISOs) &amp; Security Directors</b>: Gain executive posture dashboards, quantum risk trendlines, and verifiable CERTIFY attestations.</li>
          <li><b>Security Architects &amp; Cryptographers</b>: Analyze exact algorithm parameters, primitives, data lifetimes, and reachability.</li>
          <li><b>Engineering Managers &amp; Lead Developers</b>: Access AI-orchestrated migration roadmaps broken into prioritized waves with realistic effort sizing (~0.5 to 6 engineer days per item).</li>
          <li><b>Compliance &amp; Risk Officers</b>: Export standardized CycloneDX 1.6 CBOM files for regulatory submission.</li>
        </ul>
      </section>

      <section className="docs-section">
        <h2>What Happens When a Repository Is Scanned?</h2>
        <p>
          When you submit a repository URL or ZIP archive to IronBastion:
        </p>
        <ol>
          <li><b>Discovery</b>: The worker service checks out the target repository into an ephemeral directory or extracts the ZIP archive.</li>
          <li><b>Multi-Language Collection</b>: Specialized static collectors parse Java/Kotlin source code, Python scripts, JavaScript/TypeScript code, Maven/Gradle manifests, NPM package files, PyPI requirements, and live TLS endpoints.</li>
          <li><b>Candidate Generation</b>: Exact code locators, lines, symbols, and declared dependency versions are extracted.</li>
          <li><b>AI &amp; Deterministic Adjudication</b>: The <code>SENTINEL</code> agent filters out false positives (e.g. documentation mentions or comment text) and confirms active cryptographic code.</li>
          <li><b>Impact Assessment</b>: The <code>ORACLE</code> agent evaluates data sensitivity lifetime, network exposure, and reachability.</li>
          <li><b>Deterministic Risk Scoring</b>: The platform calculates a repeatable quantum risk score (0–100) using a fixed mathematical formula.</li>
          <li><b>CBOM &amp; Migration Roadmap</b>: The <code>ATLAS</code> agent summarizes inventory into CycloneDX 1.6 format, and the <code>MIGRATE</code> agent builds prioritized remediation waves using sanctioned NIST PQC algorithm replacements.</li>
        </ol>
      </section>
    </div>
  );
}
