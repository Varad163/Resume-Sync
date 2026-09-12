export function DocsScanningDependencyPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>Dependency Scanning</h2>
        <p>
          IronBastion's dependency collectors analyze project manifest files to discover third-party cryptographic libraries and declared versions.
        </p>
      </section>

      <section className="docs-section">
        <h2>Recognized Manifests &amp; Registries</h2>
        <ul>
          <li><b>Maven &amp; Gradle (JVM)</b>: Parses <code>pom.xml</code> and <code>build.gradle</code> for dependencies such as Bouncy Castle (<code>bcprov-jdk18on</code>), Apache Commons Crypto, Tink, and Spring Security.</li>
          <li><b>NPM (JavaScript/TypeScript)</b>: Parses <code>package.json</code> for packages such as <code>crypto-js</code>, <code>node-forge</code>, <code>elliptic</code>, <code>bcrypt</code>, and <code>jsonwebtoken</code>.</li>
          <li><b>PyPI (Python)</b>: Parses <code>requirements.txt</code>, <code>pyproject.toml</code>, and <code>setup.py</code> for packages such as <code>cryptography</code>, <code>pycryptodome</code>, <code>m2crypto</code>, and <code>paramiko</code>.</li>
        </ul>
      </section>
    </div>
  );
}
