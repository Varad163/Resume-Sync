import type { ReactNode } from "react";

export { Spectrum } from "./features/findings/components/Spectrum.js";
export { FindingsTable } from "./features/findings/components/FindingsTable.js";

export function Readout({
  items,
}: {
  items: { label: string; value: ReactNode; sub?: string; tone?: string; icon?: ReactNode; onClick?: () => void }[];
}) {
  return (
    <div className="report-summary-grid">
      {items.map((item) => (
        <div
          key={item.label}
          className={`summary-card ${item.onClick ? "clickable" : ""}`}
          onClick={item.onClick}
        >
          <div className="summary-card-header">
            <span className="summary-card-label">{item.label}</span>
            {item.icon && <span className="summary-card-icon">{item.icon}</span>}
          </div>
          <div className="summary-card-value" style={item.tone ? { color: item.tone } : undefined}>
            {item.value}
          </div>
          {item.sub ? <div className="summary-card-sub">{item.sub}</div> : null}
        </div>
      ))}
    </div>
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
