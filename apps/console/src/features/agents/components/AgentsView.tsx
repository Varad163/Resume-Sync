import { useState } from "react";
import type { AgentTrace, CollectorRun } from "../../../types/index.js";
import { ROSTER, type AgentSpec } from "../data/roster.js";

const PHASES = ["DISCOVER", "ANALYZE", "PLAN", "TEST", "VALIDATE", "REPORT", "MONITOR"] as const;

const AGENT_CATEGORIES = [
  {
    key: "ANALYZE",
    title: "Analysis Agents",
    subtitle: "Verify code context, eliminate false positives, and assess quantum exposure risks.",
    agentIds: ["sentinel", "oracle"],
  },
  {
    key: "PLAN",
    title: "Planning Agents",
    subtitle: "Assemble cryptographic bill of materials and sequence remediation into migration waves.",
    agentIds: ["atlas", "migrate"],
  },
  {
    key: "TEST",
    title: "Testing & Validation Agents",
    subtitle: "Validate implementation correctness, side-channel leakage, and fault injection tolerance.",
    agentIds: ["forge", "spectra", "vanguard", "sentinel-ot"],
  },
  {
    key: "ASSURANCE",
    title: "Assurance & Monitoring Agents",
    subtitle: "Package auditable compliance evidence and track continuous post-migration posture.",
    agentIds: ["certify", "watchtower"],
  },
];

function getAgentIcon(id: string): string {
  switch (id.toLowerCase()) {
    case "sentinel":
      return "🔍";
    case "oracle":
      return "🔮";
    case "atlas":
      return "🗺️";
    case "migrate":
      return "🚀";
    case "forge":
      return "🧪";
    case "spectra":
      return "⚡";
    case "vanguard":
      return "🎯";
    case "sentinel-ot":
      return "🏭";
    case "certify":
      return "📜";
    case "watchtower":
      return "👁️";
    default:
      return "🤖";
  }
}

export function AgentsView({
  traces,
  collectorRuns,
}: {
  traces: AgentTrace[];
  collectorRuns: CollectorRun[];
}) {
  const [open, setOpen] = useState<string>();

  const byAgent = new Map<string, AgentTrace[]>();
  for (const trace of traces) {
    const bucket = byAgent.get(trace.agentId);
    if (bucket) bucket.push(trace);
    else byAgent.set(trace.agentId, [trace]);
  }

  const modelsUsed = [...new Set(traces.map((t) => t.model))];
  const simulated = modelsUsed.some((m) => m.startsWith("simulated"));
  const ruleOnly = modelsUsed.length === 0 || modelsUsed.every((m) => m.startsWith("deterministic"));

  // Metrics based on REAL data
  const totalAgents = ROSTER.length;
  const activeRanAgents = ROSTER.filter((s) => (byAgent.get(s.id)?.length ?? 0) > 0).length;
  const builtNotRunAgents = ROSTER.filter((s) => s.built && (byAgent.get(s.id)?.length ?? 0) === 0).length;
  const notBuiltAgents = ROSTER.filter((s) => !s.built).length;

  return (
    <div className="agents-page-wrapper">
      {/* Page Header */}
      <div className="agents-header-bar">
        <div>
          <h2 className="agents-title">Security Analysis Agents</h2>
          <p className="agents-subtitle">
            Autonomous agentic pipeline used to discover, analyze, inventory, and sequence PQC remediation for your codebase.
          </p>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="agents-summary-grid">
        <div className="agent-summary-card">
          <div className="card-label">Total Roster Agents</div>
          <div className="card-value blue">{totalAgents}</div>
          <div className="card-sub">Defined security roster</div>
        </div>
        <div className="agent-summary-card">
          <div className="card-label">Active / Executed</div>
          <div className="card-value green">{activeRanAgents}</div>
          <div className="card-sub">Completed for this scan</div>
        </div>
        <div className="agent-summary-card">
          <div className="card-label">Not Run</div>
          <div className="card-value yellow">{builtNotRunAgents}</div>
          <div className="card-sub">Built but idle for target</div>
        </div>
        <div className="agent-summary-card">
          <div className="card-label">Not Available</div>
          <div className="card-value gray">{notBuiltAgents}</div>
          <div className="card-sub">Roadmap bench operations</div>
        </div>
      </div>

      {/* AI Model / Rule Mode Banner */}
      {ruleOnly ? (
        <div className="banner info-banner-styled" style={{ marginBottom: 24 }}>
          <div className="banner-icon-box">ℹ</div>
          <div>
            <div className="banner-head">Rule-based deterministic mode active</div>
            <div className="banner-text">
              Every decision for this scan was produced by deterministic rule evaluation. No external LLM model was configured. Set <code className="mono-code">ANTHROPIC_AWS_WORKSPACE_ID</code> and <code className="mono-code">AWS_REGION</code>, or <code className="mono-code">ANTHROPIC_API_KEY</code> to enable Claude reasoning.
            </div>
          </div>
        </div>
      ) : simulated ? (
        <div className="banner warning-banner-styled" style={{ marginBottom: 24 }}>
          <div className="banner-icon-box">⚡</div>
          <div>
            <div className="banner-head">Simulated agent reasoning active</div>
            <div className="banner-text">
              The agent control loop, tool executions, and schema validations are live. Reasoning steps are simulated because no model credential is provided (<code className="mono-code">simulated-agent</code>).
            </div>
          </div>
        </div>
      ) : null}

      {/* Visual Pipeline Sequence */}
      <div className="agents-pipeline-card">
        <h3 className="section-card-title">Agent Execution Pipeline</h3>
        <div className="pipeline-flow-wrapper">
          {PHASES.map((phase, idx) => {
            const collectors = phase === "DISCOVER" ? collectorRuns : [];
            const agents = ROSTER.filter(
              (spec) => spec.built && spec.phase === phase
            );
            return (
              <div key={phase} className="pipeline-stage-group">
                <div className="stage-card">
                  <div className="stage-badge">{phase}</div>
                  <div className="stage-nodes-container">
                    {collectors.map((run) => (
                      <div className="node-chip collector-chip" key={run.collectorId + run.target}>
                        <div className="chip-name">{run.collectorId}</div>
                        <div className="chip-meta">
                          {run.candidates} candidates · {run.unitsScanned} units
                        </div>
                      </div>
                    ))}
                    {agents.map((spec) => {
                      const runs = byAgent.get(spec.id) ?? [];
                      const ran = runs.length > 0;
                      return (
                        <div
                          key={spec.id}
                          className={`node-chip agent-chip ${ran ? "active-run" : "idle-run"}`}
                          onClick={() => setOpen(open === spec.id ? undefined : spec.id)}
                        >
                          <div className="chip-name">
                            {getAgentIcon(spec.id)} {spec.codename}
                          </div>
                          <div className="chip-meta">
                            {ran ? `${runs.reduce((s, r) => s + r.decisions.length, 0)} decisions` : "Not Run"}
                          </div>
                        </div>
                      );
                    })}
                    {phase === "REPORT" ? (
                      <div className="node-chip collector-chip">
                        <div className="chip-name">REPORT</div>
                        <div className="chip-meta">CBOM & Plan Report</div>
                      </div>
                    ) : null}
                  </div>
                </div>
                {idx < PHASES.length - 1 && <div className="pipeline-arrow">→</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Discovery Results - Deterministic Collectors Table */}
      {collectorRuns.length > 0 && (
        <div className="agents-collectors-card">
          <div className="card-header-bar">
            <h3 className="section-card-title">Discovery Results — Deterministic Collectors</h3>
            <span className="badge-gray">{collectorRuns.length} collectors executed</span>
          </div>

          <div className="card-table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: "20%" }}>Collector</th>
                  <th style={{ width: "35%" }}>Target</th>
                  <th style={{ width: "15%" }}>Scanned Units</th>
                  <th style={{ width: "15%" }}>Candidates Found</th>
                  <th style={{ width: "15%" }}>Duration</th>
                </tr>
              </thead>
              <tbody>
                {collectorRuns.map((run) => (
                  <tr key={run.collectorId + run.target}>
                    <td>
                      <div style={{ fontWeight: 600, color: "#f8fafc" }}>
                        {run.collectorId}{" "}
                        <span className="mono-tag" style={{ fontSize: "0.75rem", color: "#818cf8" }}>
                          v{run.version}
                        </span>
                      </div>
                    </td>
                    <td className="text-muted" style={{ fontSize: "0.85rem", fontFamily: "monospace" }}>
                      {run.target}
                      {run.notes.length > 0 ? (
                        <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 2 }}>
                          {run.notes.slice(0, 2).join(" · ")}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <span className="mono-tag">{run.unitsScanned}</span>
                    </td>
                    <td>
                      <span className={`mono-tag ${run.candidates > 0 ? "highlight" : ""}`}>
                        {run.candidates}
                      </span>
                    </td>
                    <td className="text-muted">{run.durationMs}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Grouped Agent Roster Cards */}
      {AGENT_CATEGORIES.map((category) => {
        const categoryAgents = ROSTER.filter((s) => category.agentIds.includes(s.id));
        if (categoryAgents.length === 0) return null;

        return (
          <div key={category.key} className="agent-category-block">
            <div className="category-header">
              <h3 className="category-title">{category.title}</h3>
              <p className="category-subtitle">{category.subtitle}</p>
            </div>

            <div className="agents-grid">
              {categoryAgents.map((spec) => {
                const runs = byAgent.get(spec.id) ?? [];
                return (
                  <AgentCard
                    key={spec.id}
                    spec={spec}
                    runs={runs}
                    open={open === spec.id}
                    onToggle={() => setOpen(open === spec.id ? undefined : spec.id)}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AgentCard({
  spec,
  runs,
  open,
  onToggle,
}: {
  spec: AgentSpec;
  runs: AgentTrace[];
  open: boolean;
  onToggle: () => void;
}) {
  const ran = runs.length > 0;
  const totals = runs.reduce(
    (acc, run) => ({
      turns: acc.turns + run.turns.length,
      tools: acc.tools + run.toolCalls.length,
      decisions: acc.decisions + run.decisions.length,
      inputTokens: acc.inputTokens + run.inputTokens,
      outputTokens: acc.outputTokens + run.outputTokens,
      costCents: acc.costCents + run.costCents,
      durationMs: acc.durationMs + run.durationMs,
    }),
    { turns: 0, tools: 0, decisions: 0, inputTokens: 0, outputTokens: 0, costCents: 0, durationMs: 0 },
  );
  const model = runs[0]?.model ?? "—";
  const byRules = model.startsWith("deterministic");
  const bySimulation = model.startsWith("simulated");

  return (
    <div className={`professional-agent-card ${spec.built ? "" : "not-built-card"}`}>
      <div className="card-top-row">
        <div className="agent-identity">
          <span className="agent-avatar-icon">{getAgentIcon(spec.id)}</span>
          <div>
            <h4 className="agent-codename">{spec.codename}</h4>
            <span className="agent-discipline-text">{spec.discipline}</span>
          </div>
        </div>

        <div className="agent-status-badge-container">
          {!spec.built ? (
            <span className="agent-badge not-built">Not Built</span>
          ) : !ran ? (
            <span className="agent-badge not-run">Not Run</span>
          ) : byRules ? (
            <span className="agent-badge rules">Rules</span>
          ) : bySimulation ? (
            <span className="agent-badge sim">Simulated</span>
          ) : (
            <span className="agent-badge active-model">{model}</span>
          )}
        </div>
      </div>

      <p className="agent-mission-description">{spec.mission}</p>

      {spec.note && (
        <div className="agent-note-box">
          <span className="note-label">Note:</span> {spec.note}
        </div>
      )}

      {ran ? (
        <div className="agent-execution-footer">
          <div className="agent-stats-metrics">
            <div className="stat-pill">
              <b>{totals.decisions}</b> decisions
            </div>
            <div className="stat-pill">
              <b>{runs.length}</b> {runs.length === 1 ? "run" : "runs"}
            </div>
            <div className="stat-pill">
              <b>{totals.turns}</b> turns
            </div>
            <div className="stat-pill">
              <b>{totals.tools}</b> tool calls
            </div>
            <div className="stat-pill">
              <b>{totals.durationMs}</b>ms
            </div>
          </div>

          <button type="button" className="btn ghost sm toggle-details-btn" onClick={onToggle}>
            {open ? "Hide Details ▲" : "View Details ▼"}
          </button>
        </div>
      ) : (
        <div className="agent-idle-footer">
          <span className="text-dim" style={{ fontSize: "0.8rem" }}>
            {!spec.built
              ? "This agent is part of the IronBastion roadmap."
              : "Agent did not execute for the target repository."}
          </span>
        </div>
      )}

      {open && ran ? <AgentDetail runs={runs} /> : null}
    </div>
  );
}

function AgentDetail({ runs }: { runs: AgentTrace[] }) {
  return (
    <div className="agent-detail-drawer">
      {runs.map((run, index) => (
        <div key={`${run.agentId}-${index}`} className="run-detail-block">
          <div className="detail-section-title">Task Specification</div>
          <div className="task-box mono">{run.task}</div>

          {run.toolCalls.length > 0 ? (
            <>
              <div className="detail-section-title" style={{ marginTop: 16 }}>
                Tool Invocations ({run.toolCalls.length})
              </div>
              <div className="card-table-wrapper" style={{ marginBottom: 16 }}>
                <table className="custom-table compact">
                  <thead>
                    <tr>
                      <th style={{ width: 130 }}>Tool</th>
                      <th style={{ width: 220 }}>Arguments</th>
                      <th>Output Preview</th>
                    </tr>
                  </thead>
                  <tbody>
                    {run.toolCalls.map((call, i) => (
                      <tr key={i}>
                        <td className="mono" style={{ color: call.failed ? "#ef4444" : "#818cf8", fontWeight: 600 }}>
                          {call.tool}
                        </td>
                        <td className="mono small" style={{ fontSize: "0.75rem" }}>
                          {JSON.stringify(call.input)}
                        </td>
                        <td className="small" style={{ color: "#94a3b8", fontSize: "0.75rem" }}>
                          {call.resultPreview}
                          <div style={{ color: "#64748b", fontSize: "0.7rem", marginTop: 2 }}>
                            {call.resultBytes} bytes · {call.durationMs}ms
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}

          {run.turns.length > 0 ? (
            <>
              <div className="detail-section-title">Reasoning Turns ({run.turns.length})</div>
              <div className="card-table-wrapper" style={{ marginBottom: 16 }}>
                <table className="custom-table compact">
                  <thead>
                    <tr>
                      <th style={{ width: 44 }}>#</th>
                      <th>Reasoning / Output</th>
                      <th style={{ width: 150 }}>Tools Called</th>
                      <th style={{ width: 120 }}>Tokens</th>
                    </tr>
                  </thead>
                  <tbody>
                    {run.turns.map((turn, i) => (
                      <tr key={i}>
                        <td className="mono">{turn.turn}</td>
                        <td className="small" style={{ fontSize: "0.8rem" }}>
                          {turn.rejection ? (
                            <span style={{ color: "#ef4444" }}>
                              submission rejected: {turn.rejection}
                            </span>
                          ) : (
                            turn.text || <span style={{ color: "#10b981" }}>—</span>
                          )}
                        </td>
                        <td className="mono small" style={{ fontSize: "0.75rem" }}>
                          {turn.toolNames.join(", ") || "—"}
                        </td>
                        <td className="mono small" style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                          {turn.inputTokens.toLocaleString()} in / {turn.outputTokens.toLocaleString()} out
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}

          <div className="detail-section-title">Agent Decisions ({run.decisions.length})</div>
          <div className="card-table-wrapper">
            <table className="custom-table compact">
              <thead>
                <tr>
                  <th style={{ width: "30%" }}>Subject</th>
                  <th style={{ width: "25%" }}>Outcome</th>
                  <th style={{ width: "10%" }}>Confidence</th>
                  <th style={{ width: "35%" }}>Rationale</th>
                </tr>
              </thead>
              <tbody>
                {run.decisions.map((decision, i) => (
                  <tr key={i}>
                    <td className="small" style={{ fontWeight: 600, color: "#f8fafc" }}>
                      {decision.subject}
                    </td>
                    <td className="mono small" style={{ color: "#818cf8", fontWeight: 600 }}>
                      {decision.outcome}
                    </td>
                    <td className="mono small">
                      {decision.confidence === undefined ? "—" : decision.confidence.toFixed(2)}
                    </td>
                    <td className="small" style={{ color: "#94a3b8", fontSize: "0.8rem" }}>
                      {decision.rationale}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
