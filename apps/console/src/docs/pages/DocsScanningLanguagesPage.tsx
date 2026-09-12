export function DocsScanningLanguagesPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>Supported Languages &amp; Ecosystems</h2>
        <p>
          IronBastion features built-in static analysis collectors for the following programming languages, manifest managers, and network protocols:
        </p>
      </section>

      <section className="docs-section">
        <h2>Ecosystem Coverage Matrix</h2>
        <table className="docs-table" style={{ width: "100%", borderCollapse: "collapse", marginTop: "16px" }}>
          <thead>
            <tr style={{ background: "var(--bg-card)", textAlign: "left" }}>
              <th style={{ padding: "10px", border: "1px solid var(--border)" }}>Ecosystem</th>
              <th style={{ padding: "10px", border: "1px solid var(--border)" }}>Source Collectors</th>
              <th style={{ padding: "10px", border: "1px solid var(--border)" }}>Manifest Collectors</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><b>JVM (Java / Kotlin)</b></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>jvmSourceCollector</code> (.java files)</td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>jvmDependencyCollector</code> (pom.xml, build.gradle)</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><b>Python</b></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>pythonSourceCollector</code> (.py files)</td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>pypiDependencyCollector</code> (requirements.txt, pyproject.toml, setup.py)</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><b>JavaScript / TypeScript</b></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>jsSourceCollector</code> (.js, .jsx, .ts, .tsx files)</td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>npmDependencyCollector</code> (package.json)</td>
            </tr>
            <tr>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><b>TLS Endpoints</b></td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}><code>tlsProbeCollector</code> (live SSL/TLS socket)</td>
              <td style={{ padding: "10px", border: "1px solid var(--border)" }}>X.509 ASN.1 certificate parsing</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="docs-section">
        <h2>Language Limitations</h2>
        <p>
          Languages such as C/C++, Go, Rust, and Swift do not currently have dedicated AST collectors. They are scanned via generic pattern fallback or package manifest collectors where applicable.
        </p>
      </section>
    </div>
  );
}
