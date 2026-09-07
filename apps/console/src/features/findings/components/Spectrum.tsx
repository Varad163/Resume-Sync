import type { Finding } from "@ironbastion/core";

const QUANTUM_CLASS: Record<string, string> = {
  broken: "broken",
  weakened: "weakened",
  safe: "safe",
  unknown: "unknown",
};

/**
 * The risk spectrum.
 * Every confirmed finding is a tick on a 0-100 scale.
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
    <div className="spectrum-card">
      <div className="spectrum-card-header">
        <div>
          <h3 className="spectrum-title">Risk Spectrum</h3>
          <p className="spectrum-subtitle">
            <b>{findings.length} confirmed findings</b> · Risk distribution across detected cryptographic primitives.
          </p>
        </div>
        <div className="spectrum-scale-hint">0 = no exposure · 100 = broken, reachable, long-lived</div>
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
            title={`Score: ${finding.risk.score} — ${finding.title}`}
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
          <i style={{ background: "var(--critical)" }} /> Broken by Shor
        </span>
        <span>
          <i style={{ background: "var(--legacy)" }} /> Weakened by Grover
        </span>
        <span>
          <i style={{ background: "var(--quantum)" }} /> Quantum-safe
        </span>
        <span>
          <i style={{ background: "var(--tick)" }} /> Unresolved
        </span>
      </div>
    </div>
  );
}
