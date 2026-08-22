/** Presentational pieces shared across the console views. */

import { Fragment, useMemo, useState, type ReactNode } from "react";
import type { Finding } from "@ironbastion/core";

export function Readout({ items }: { items: { label: string; value: ReactNode; sub?: string; tone?: string }[] }) {
  return (
    <div className="readout">
      {items.map((item) => (
        <div key={item.label}>
          <div className="label">{item.label}</div>
          <div className="value" style={item.tone ? { color: item.tone } : undefined}>
            {item.value}
          </div>
          {item.sub ? <div className="sub">{item.sub}</div> : null}
        </div>
      ))}
    </div>
  );
}

const QUANTUM_CLASS: Record<string, string> = {
  broken: "broken",
  weakened: "weakened",
  safe: "safe",
  unknown: "unknown",
};

/**
 * The risk spectrum.
 *
 * Every confirmed finding is a tick on a 0-100 scale, coloured by what a
 * quantum computer does to it. It answers the question a severity donut cannot:
 * is this estate a few bad findings, or a wall of them?
 */
export function Spectrum({
  findings,
  onSelect,
}: {
  findings: readonly Finding[];
  onSelect: (id: string) => void;
}) {
  const gridlines = [0, 20, 40, 60, 80, 100];

  return (
    <div className="spectrum">
      <div className="top">
        <div className="label">Risk spectrum — {findings.length} confirmed findings</div>
        <div className="label">0 = no exposure · 100 = broken, reachable, long-lived</div>
      </div>
      <div className="track">
        <div className="grid" aria-hidden>
          {gridlines.map((value) => (
            <i key={value} style={{ left: `${value}%` }} />
          ))}
          {gridlines.map((value) => (
            <b key={value} style={{ left: `${value}%` }}>
              {value}
            </b>
          ))}
        </div>
        {findings.map((finding, index) => (
          <button
            key={finding.id}
            type="button"
            className={`tick ${QUANTUM_CLASS[finding.quantum] ?? "unknown"}`}
            style={{
              left: `calc(16px + ${finding.risk.score}% - 1px)`,
              height: `${28 + (finding.risk.score / 100) * 34}px`,
              animationDelay: `${Math.min(index * 12, 400)}ms`,
            }}
            title={`${finding.risk.score} — ${finding.title}`}
            onClick={() => onSelect(finding.id)}
          >
            <span className="sr-only" style={{ position: "absolute", left: -9999 }}>
              {finding.title}, risk {finding.risk.score}
            </span>
          </button>
        ))}
      </div>
      <div className="legend">
        <span>
          <i style={{ background: "var(--critical)" }} /> broken by Shor
        </span>
        <span>
          <i style={{ background: "var(--legacy)" }} /> weakened by Grover
        </span>
        <span>
          <i style={{ background: "var(--quantum)" }} /> quantum-safe
        </span>
        <span>
          <i style={{ background: "var(--tick)" }} /> unresolved
        </span>
      </div>
    </div>
  );
}

const SEVERITIES = ["critical", "high", "medium", "low", "informational"] as const;

export function FindingsTable({
  findings,
  selected,
  onSelect,
}: {
  findings: readonly Finding[];
  selected?: string;
  onSelect: (id: string | undefined) => void;
}) {
  const [severity, setSeverity] = useState<string | undefined>(undefined);

  const shown = useMemo(
    () => (severity ? findings.filter((f) => f.risk.severity === severity) : findings),
    [findings, severity],
  );

  return (
    <>
      <div className="filters">
        <button type="button" aria-pressed={!severity} onClick={() => setSeverity(undefined)}>
          all {findings.length}
        </button>
        {SEVERITIES.map((level) => {
          const count = findings.filter((f) => f.risk.severity === level).length;
          if (count === 0) return null;
          return (
            <button
              key={level}
              type="button"
              aria-pressed={severity === level}
              onClick={() => setSeverity(severity === level ? undefined : level)}
            >
              {level} {count}
            </button>
          );
        })}
      </div>

      <table className="data">
        <thead>
          <tr>
            <th style={{ width: 56 }}>Risk</th>
            <th>Finding</th>
            <th style={{ width: 150 }}>Replacement</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((finding) => {
            const evidence = finding.provenance.evidence[0];
            const where = evidence
              ? `${evidence.locator}${evidence.startLine ? `:${evidence.startLine}` : ""}`
              : finding.component;
            const byRules = finding.adjudication.provenance.model.startsWith("deterministic");
            const isOpen = selected === finding.id;

            return (
              <Fragment key={finding.id}>
                <tr
                  className="row"
                  onClick={() => onSelect(isOpen ? undefined : finding.id)}
                >
                  <td className={`score sev-${finding.risk.severity}`}>{finding.risk.score}</td>
                  <td>
                    <div className="title">{finding.title}</div>
                    <div className="where">{where}</div>
                    <div className="prov">
                      found by <b>{finding.provenance.ruleId}</b> · judged by{" "}
                      {byRules ? (
                        <span className="rules">rules, not a model</span>
                      ) : (
                        <b>{finding.adjudication.provenance.model}</b>
                      )}{" "}
                      · confidence {finding.adjudication.confidence.toFixed(2)}
                    </div>
                  </td>
                  <td className="arrow">{finding.recommendedAlgorithm ?? "—"}</td>
                </tr>
                {isOpen ? (
                  <tr className="detail">
                    <td colSpan={3}>
                      <FindingDetail finding={finding} />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

function FindingDetail({ finding }: { finding: Finding }) {
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

export function PhaseTrail({ phase, status }: { phase: string; status: string }) {
  const phases = ["DISCOVER", "ANALYZE", "PLAN", "REPORT", "DONE"];
  const index = phases.indexOf(phase);

  return (
    <div className="phase">
      {phases.map((name, i) => (
        <span
          key={name}
          className={i < index || status === "succeeded" ? "done" : i === index ? "active" : ""}
        >
          {name}
        </span>
      ))}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {children}
    </div>
  );
}
