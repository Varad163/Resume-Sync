/**
 * What the agents did.
 *
 * The pipeline is the product's claim; this view is the evidence for it. For
 * each agent it shows the job it was given, the model that ran it, every file it
 * opened, every search it made, and every decision it reached — plus the six
 * agents on the roster that are not built, marked as such rather than mocked.
 */

import { useState } from "react";
import type { AgentTrace, CollectorRun } from "./api.js";

interface AgentSpec {
  readonly id: string;
  readonly codename: string;
  readonly discipline: string;
  readonly phase: string;
  readonly mission: string;
  readonly built: boolean;
  readonly note?: string;
}

/** The roster the marketing site describes, with build status told honestly. */
const ROSTER: readonly AgentSpec[] = [
  {
    id: "sentinel",
    codename: "SENTINEL",
    discipline: "Cryptographic discovery",
    phase: "ANALYZE",
    mission:
      "Decide what each detection actually is: real cryptography or a false positive, running in production or only in tests, and — where the collector could not resolve it — which algorithm is really configured.",
    built: true,
  },
  {
    id: "oracle",
    codename: "ORACLE",
    discipline: "Quantum risk assessment",
    phase: "ANALYZE",
    mission:
      "Decide what the cryptography protects: how long the data stays sensitive, and how exposed the component is. Supplies evidence to the scoring formula; never writes a score.",
    built: true,
  },
  {
    id: "atlas",
    codename: "ATLAS",
    discipline: "Crypto inventory & CBOM",
    phase: "PLAN",
    mission:
      "Read the assembled Cryptographic Bill of Materials and state what this estate runs on, where the quantum-vulnerable weight sits, and the structural facts that matter.",
    built: true,
  },
  {
    id: "migrate",
    codename: "MIGRATE",
    discipline: "PQC migration planning",
    phase: "PLAN",
    mission:
      "Sequence the work into waves aimed at the public milestones, with dependencies, risks and validation. Algorithm choice is dictated by the standards registry, not by the agent.",
    built: true,
  },
  {
    id: "forge",
    codename: "FORGE",
    discipline: "PQC implementation testing",
    phase: "TEST",
    mission: "Test that a standardised algorithm is implemented correctly, not merely selected.",
    built: false,
    note: "Not built. Needs a fuzzing and constant-time harness of its own.",
  },
  {
    id: "spectra",
    codename: "SPECTRA",
    discipline: "Side-channel analysis",
    phase: "TEST",
    mission: "Measure what an implementation leaks through power, timing and electromagnetic emission.",
    built: false,
    note: "Not software. A bench operation on real hardware, authorised by a qualified engineer.",
  },
  {
    id: "vanguard",
    codename: "VANGUARD",
    discipline: "Fault injection",
    phase: "TEST",
    mission: "Establish whether an implementation survives deliberate glitching.",
    built: false,
    note: "Not software. A bench operation on real hardware, authorised by a qualified engineer.",
  },
  {
    id: "sentinel-ot",
    codename: "SENTINEL-OT",
    discipline: "Critical infrastructure validation",
    phase: "VALIDATE",
    mission: "Validate cryptography in OT and industrial protocols without disturbing the process.",
    built: false,
    note: "Not built. Needs an industrial protocol stack and a lab.",
  },
  {
    id: "certify",
    codename: "CERTIFY",
    discipline: "Assurance & compliance",
    phase: "REPORT",
    mission: "Package evidence so a result is auditable and traceable to its source.",
    built: false,
    note: "Not built. Consumes the outputs above; follows once testing exists.",
  },
  {
    id: "watchtower",
    codename: "WATCHTOWER",
    discipline: "Continuous monitoring",
    phase: "MONITOR",
    mission: "Hold the current posture and raise what changed, including a migrated system that fell back.",
    built: false,
    note: "Not built. Follows once scans are running on a schedule.",
  },
];

const PHASES = ["DISCOVER", "ANALYZE", "PLAN", "REPORT"] as const;

export function AgentsView({
  traces,
  collectorRuns,
}: {
  traces: AgentTrace[];
  collectorRuns: CollectorRun[];
}) {
  const [open, setOpen] = useState<string>();

  if (traces.length === 0 && collectorRuns.length === 0) {
    return (
      <div className="empty">
        <h3>No agent activity recorded</h3>
        <p>Agent activity appears here once a scan has run.</p>
      </div>
    );
  }

  const byAgent = new Map<string, AgentTrace[]>();
  for (const trace of traces) {
    const bucket = byAgent.get(trace.agentId);
    if (bucket) bucket.push(trace);
    else byAgent.set(trace.agentId, [trace]);
  }

  const modelsUsed = [...new Set(traces.map((t) => t.model))];
  const simulated = modelsUsed.some((m) => m.startsWith("simulated"));
  const ruleOnly = modelsUsed.every((m) => m.startsWith("deterministic"));

  return (
    <>
      {ruleOnly ? (
        <div className="banner">
          <b>No model configured</b>
          Every decision below was made by rules, not by a model. Set
          ANTHROPIC_AWS_WORKSPACE_ID and AWS_REGION, or ANTHROPIC_API_KEY, and the same
          agents run on Claude with their reasoning recorded here.
        </div>
      ) : simulated ? (
        <div className="banner">
          <b>Simulated reasoning</b>
          The agent loop, the read-only tools, schema validation and this trace are all
          real. The reasoning is simulated because no model credential is configured, and
          every decision is stamped <span className="mono">simulated-agent</span>.
        </div>
      ) : null}

      {/* The pipeline, as it actually ran. */}
      <div className="pipeline">
        {PHASES.map((phase) => {
          const collectors = phase === "DISCOVER" ? collectorRuns : [];
          const agents = ROSTER.filter(
            (spec) => spec.built && byAgent.has(spec.id) && byAgent.get(spec.id)![0]!.phase === phase,
          );
          return (
            <div className="stage" key={phase}>
              <div className="label">{phase}</div>
              {collectors.map((run) => (
                <div className="node collector" key={run.collectorId + run.target}>
                  <div className="mono name">{run.collectorId}</div>
                  <div className="sub">
                    {run.candidates} candidates · {run.unitsScanned} units
                  </div>
                </div>
              ))}
              {agents.map((spec) => {
                const runs = byAgent.get(spec.id)!;
                const tools = runs.reduce((sum, run) => sum + run.toolCalls.length, 0);
                return (
                  <button
                    type="button"
                    className="node agent"
                    key={spec.id}
                    onClick={() => setOpen(open === spec.id ? undefined : spec.id)}
                  >
                    <div className="mono name">{spec.codename}</div>
                    <div className="sub">
                      {runs.reduce((sum, run) => sum + run.decisions.length, 0)} decisions
                      {tools > 0 ? ` · ${tools} tool calls` : ""}
                    </div>
                  </button>
                );
              })}
              {phase === "REPORT" ? (
                <div className="node collector">
                  <div className="mono name">report</div>
                  <div className="sub">CBOM, plan, assurance report</div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Collectors: the deterministic half of the pipeline. */}
      <h3 className="label sectionhead">Discovery — deterministic collectors</h3>
      <table className="data">
        <thead>
          <tr>
            <th style={{ width: 150 }}>Collector</th>
            <th>Target</th>
            <th style={{ width: 110 }}>Scanned</th>
            <th style={{ width: 110 }}>Candidates</th>
            <th style={{ width: 90 }}>Time</th>
          </tr>
        </thead>
        <tbody>
          {collectorRuns.map((run) => (
            <tr key={run.collectorId + run.target}>
              <td className="mono" style={{ color: "var(--display)" }}>
                {run.collectorId} <span style={{ color: "var(--tick)" }}>v{run.version}</span>
              </td>
              <td>
                {run.target}
                {run.notes.length > 0 ? (
                  <div className="where">{run.notes.slice(0, 2).join(" · ")}</div>
                ) : null}
              </td>
              <td className="mono">{run.unitsScanned}</td>
              <td className="mono">{run.candidates}</td>
              <td className="mono" style={{ color: "var(--muted)" }}>
                {run.durationMs}ms
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Agents: the reasoning half. */}
      <h3 className="label sectionhead">Agents</h3>
      {ROSTER.map((spec) => {
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
    </>
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
    <section className={`agentcard ${spec.built ? "" : "planned"}`}>
      <header>
        <button type="button" onClick={onToggle} disabled={!ran} className="agenthead">
          <div>
            <span className="mono codename">{spec.codename}</span>
            <span className="discipline">{spec.discipline}</span>
          </div>
          <div className="status">
            {!spec.built ? (
              <span className="tag planned">not built</span>
            ) : !ran ? (
              <span className="tag idle">did not run</span>
            ) : byRules ? (
              <span className="tag rules">rules</span>
            ) : bySimulation ? (
              <span className="tag sim">simulated</span>
            ) : (
              <span className="tag model">{model}</span>
            )}
          </div>
        </button>
      </header>

      <div className="mission">{spec.mission}</div>
      {spec.note ? <div className="note planned-note">{spec.note}</div> : null}

      {ran ? (
        <>
          <div className="agentstats">
            <span>
              <b>{totals.decisions}</b> decisions
            </span>
            <span>
              <b>{runs.length}</b> run{runs.length === 1 ? "" : "s"}
            </span>
            <span>
              <b>{totals.turns}</b> turns
            </span>
            <span>
              <b>{totals.tools}</b> tool calls
            </span>
            <span>
              <b>{totals.inputTokens.toLocaleString()}</b> in /{" "}
              <b>{totals.outputTokens.toLocaleString()}</b> out
            </span>
            <span>
              <b>${(totals.costCents / 100).toFixed(4)}</b>
            </span>
            <span>
              <b>{totals.durationMs}</b>ms
            </span>
          </div>

          {open ? <AgentDetail runs={runs} /> : null}
        </>
      ) : null}
    </section>
  );
}

function AgentDetail({ runs }: { runs: AgentTrace[] }) {
  return (
    <div className="agentdetail">
      {runs.map((run, index) => (
        <div key={`${run.agentId}-${index}`}>
          <h4>Task given</h4>
          <p className="mono small">{run.task}</p>

          {run.toolCalls.length > 0 ? (
            <>
              <h4>What it looked at</h4>
              <table className="data compact">
                <thead>
                  <tr>
                    <th style={{ width: 130 }}>Tool</th>
                    <th style={{ width: 230 }}>Arguments</th>
                    <th>What came back</th>
                  </tr>
                </thead>
                <tbody>
                  {run.toolCalls.map((call, i) => (
                    <tr key={i}>
                      <td className="mono" style={{ color: call.failed ? "var(--critical)" : "var(--quantum)" }}>
                        {call.tool}
                      </td>
                      <td className="mono small">{JSON.stringify(call.input)}</td>
                      <td className="small" style={{ color: "var(--muted)" }}>
                        {call.resultPreview}
                        <div className="where">
                          {call.resultBytes} bytes · {call.durationMs}ms
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : null}

          {run.turns.length > 0 ? (
            <>
              <h4>Turns</h4>
              <table className="data compact">
                <thead>
                  <tr>
                    <th style={{ width: 44 }}>#</th>
                    <th>What it said</th>
                    <th style={{ width: 150 }}>Tools called</th>
                    <th style={{ width: 130 }}>Tokens</th>
                  </tr>
                </thead>
                <tbody>
                  {run.turns.map((turn, i) => (
                    <tr key={i}>
                      <td className="mono">{turn.turn}</td>
                      <td className="small">
                        {turn.rejection ? (
                          <span style={{ color: "var(--legacy)" }}>
                            submission rejected: {turn.rejection}
                          </span>
                        ) : (
                          turn.text || <span style={{ color: "var(--tick)" }}>—</span>
                        )}
                      </td>
                      <td className="mono small">{turn.toolNames.join(", ") || "—"}</td>
                      <td className="mono small">
                        {turn.inputTokens.toLocaleString()} / {turn.outputTokens.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : null}

          <h4>Decisions</h4>
          <table className="data compact">
            <thead>
              <tr>
                <th style={{ width: 280 }}>Subject</th>
                <th style={{ width: 240 }}>Outcome</th>
                <th style={{ width: 70 }}>Conf.</th>
                <th>Reasoning</th>
              </tr>
            </thead>
            <tbody>
              {run.decisions.map((decision, i) => (
                <tr key={i}>
                  <td className="small" style={{ color: "var(--display)" }}>
                    {decision.subject}
                  </td>
                  <td className="mono small" style={{ color: "var(--quantum)" }}>
                    {decision.outcome}
                  </td>
                  <td className="mono small">
                    {decision.confidence === undefined ? "—" : decision.confidence.toFixed(2)}
                  </td>
                  <td className="small" style={{ color: "var(--muted)" }}>
                    {decision.rationale}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
