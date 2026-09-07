import { Fragment, useMemo, useState } from "react";
import type { Finding } from "@ironbastion/core";
import { FindingDetail } from "./FindingDetail.js";

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
    <div className="findings-table-wrapper">
      <div className="findings-filter-chips">
        <button
          type="button"
          className={`filter-chip ${!severity ? "active" : ""}`}
          onClick={() => setSeverity(undefined)}
        >
          All · {findings.length}
        </button>
        {SEVERITIES.map((level) => {
          const count = findings.filter((f) => f.risk.severity === level).length;
          if (count === 0) return null;
          return (
            <button
              key={level}
              type="button"
              className={`filter-chip chip-${level} ${severity === level ? "active" : ""}`}
              onClick={() => setSeverity(severity === level ? undefined : level)}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)} · {count}
            </button>
          );
        })}
      </div>

      <table className="report-findings-table">
        <thead>
          <tr>
            <th style={{ width: 110 }}>Risk</th>
            <th>Finding &amp; Location</th>
            <th style={{ width: 220 }}>Replacement</th>
            <th style={{ width: 100, textAlign: "right" }}>Action</th>
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
                  className={`finding-row ${isOpen ? "selected" : ""}`}
                  onClick={() => onSelect(isOpen ? undefined : finding.id)}
                >
                  <td>
                    <div className={`sev-badge-pill sev-${finding.risk.severity}`}>
                      <span>{finding.risk.severity.toUpperCase()}</span>
                      <span className="score-num">{finding.risk.score}</span>
                    </div>
                  </td>
                  <td>
                    <div className="finding-title-text">{finding.title}</div>
                    <div className="finding-location-text">{where}</div>
                    <div className="finding-prov-text">
                      rule <b>{finding.provenance.ruleId}</b> · judged by{" "}
                      {byRules ? (
                        <span className="rules">rules</span>
                      ) : (
                        <b>{finding.adjudication.provenance.model}</b>
                      )}{" "}
                      · confidence {finding.adjudication.confidence.toFixed(2)}
                    </div>
                  </td>
                  <td>
                    {finding.recommendedAlgorithm ? (
                      <div className="replacement-tag">
                        <span>{finding.algorithm}</span>
                        <span className="arrow">→</span>
                        <span className="target">{finding.recommendedAlgorithm}</span>
                      </div>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(isOpen ? undefined : finding.id);
                      }}
                    >
                      {isOpen ? "Close" : "View"}
                    </button>
                  </td>
                </tr>
                {isOpen ? (
                  <tr className="finding-detail-row">
                    <td colSpan={4}>
                      <FindingDetail finding={finding} />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
