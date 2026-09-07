import type { Finding } from "@ironbastion/core";

export function FindingDetail({ finding }: { finding: Finding }) {
  const evidence = finding.provenance.evidence[0];

  return (
    <>
      <h4>Why this score</h4>
      <p>{finding.risk.explanation}</p>

      <div className="factors">
        {Object.entries(finding.risk.factors).map(([name, value]) => (
          <div key={name}>
            <div className="label">{name.replace(/([A-Z])/g, " $1")}</div>
            <div className="mono" style={{ fontSize: 13, color: "var(--display)", marginTop: 6 }}>
              {(value as number).toFixed(2)}
            </div>
            <div className="bar">
              <i style={{ width: `${(value as number) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      <h4>Adjudication</h4>
      <p>{finding.adjudication.rationale}</p>

      {evidence?.snippet ? (
        <>
          <h4>
            Evidence — {evidence.locator}
            {evidence.startLine ? `:${evidence.startLine}` : ""}
          </h4>
          <pre>{evidence.snippet}</pre>
        </>
      ) : null}

      <h4>Provenance</h4>
      <p className="mono" style={{ fontSize: 11.5, color: "var(--muted)" }}>
        collector {finding.provenance.collectorId} v{finding.provenance.collectorVersion} · rule{" "}
        {finding.provenance.ruleId} · collector confidence {finding.provenance.confidence}
        <br />
        adjudicated by {finding.adjudication.provenance.agentId} ·{" "}
        {finding.adjudication.provenance.model} · prompt{" "}
        {finding.adjudication.provenance.promptVersion}
        {evidence?.snippetSha256 ? (
          <>
            <br />
            evidence sha256 {evidence.snippetSha256.slice(0, 32)}…
          </>
        ) : null}
      </p>
    </>
  );
}
