export function DocsUsingWatchtowerPage() {
  return (
    <div className="docs-page-content">
      <section className="docs-section">
        <h2>Watchtower Continuous Monitoring</h2>
        <p>
          <b>Watchtower</b> is IronBastion's continuous monitoring engine. It tracks remote Git repositories for commit SHA changes and performs differential cryptographic analysis to alert security teams when new cryptographic risks are introduced.
        </p>
      </section>

      <section className="docs-section">
        <h2>Differential Posture Tracking</h2>
        <p>
          When Watchtower runs against a project, it compares the latest successful scan against the previous scan using stable identity fingerprints (excluding volatile line numbers):
        </p>
        <ul>
          <li><b>Introduced Findings</b>: Cryptographic vulnerabilities present in the current commit but absent in the baseline.</li>
          <li><b>Resolved Findings</b>: Cryptographic vulnerabilities present in the baseline but fixed in the current commit.</li>
          <li><b>Persistent Findings</b>: Findings present in both scans, tracking score deltas or severity shifts.</li>
          <li><b>Score Shift</b>: The net change in overall posture score between scan runs.</li>
        </ul>
      </section>

      <section className="docs-section">
        <h2>Duplicate Prevention &amp; Polling</h2>
        <p>
          When Watchtower polls a remote repository (via <code>POST /v1/projects/:id/monitor</code>), it checks remote HEAD SHA using <code>git ls-remote</code>. If the remote HEAD commit matches the latest completed scan's commit, Watchtower returns <code>status: "up-to-date"</code> without queuing redundant scan runs.
        </p>
      </section>
    </div>
  );
}
