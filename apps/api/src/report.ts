/**
 * The assurance report.
 *
 * Served as a self-contained HTML document with a print stylesheet, because the
 * artefact a customer files with an auditor has to survive being printed, and
 * because a report whose every figure is reproducible from the JSON on the same
 * endpoint is more defensible than a rendered PDF nobody can check.
 */

import {
  MILESTONES,
  type Finding,
  type MigrationPlan,
  type ScanRecord,
} from "@ironbastion/core";
import type { CycloneDxBom } from "@ironbastion/cbom";

export interface ReportInput {
  readonly scan: ScanRecord;
  readonly projectName: string;
  readonly findings: readonly Finding[];
  readonly cbom?: CycloneDxBom;
  readonly plan?: MigrationPlan;
  readonly posture?: { overall: number; severity: string; counts: Record<string, number> };
  readonly notes: readonly string[];
  readonly inventory?: { summary: string; observations: string[] };
}

const SEVERITY_COLOUR: Record<string, string> = {
  critical: "#b3251f",
  high: "#a2620f",
  medium: "#8a6329",
  low: "#1e7f8c",
  informational: "#5a6672",
};

export function renderHtmlReport(input: ReportInput): string {
  const { scan, findings, plan, posture } = input;
  const ranked = [...findings].sort((a, b) => b.risk.score - a.risk.score);
  const modelJudged = findings.filter(
    (finding) => !finding.adjudication.provenance.model.startsWith("deterministic"),
  ).length;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Quantum Security Assessment — ${escapeHtml(input.projectName)}</title>
<style>
  :root {
    --ink: #12171d; --muted: #5a6672; --hair: #d9dee4; --paper: #ffffff;
    --quantum: #10707d; --accent: #0e1319;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: #eef1f4; color: var(--ink);
    font: 15px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  .page { max-width: 900px; margin: 0 auto; background: var(--paper); padding: 56px 64px; }
  h1 { font-size: 30px; line-height: 1.15; letter-spacing: -0.02em; margin: 0 0 6px; }
  h2 { font-size: 13px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted);
       margin: 44px 0 14px; padding-bottom: 8px; border-bottom: 1px solid var(--hair); }
  h3 { font-size: 17px; margin: 26px 0 6px; }
  p { margin: 0 0 12px; }
  .mono { font-family: ui-monospace, "SFMono-Regular", Menlo, monospace; }
  .masthead { display: flex; justify-content: space-between; align-items: baseline;
              border-bottom: 2px solid var(--accent); padding-bottom: 14px; }
  .brand { font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; font-size: 14px; }
  .brand span { color: var(--muted); }
  .meta { color: var(--muted); font-size: 12px; text-align: right; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: var(--hair);
          border: 1px solid var(--hair); margin: 26px 0; }
  .cell { background: var(--paper); padding: 16px 18px; }
  .cell .label { font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted); }
  .cell .value { font-size: 26px; font-weight: 700; letter-spacing: -0.02em; margin-top: 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase;
       color: var(--muted); border-bottom: 1px solid var(--hair); padding: 8px 10px 8px 0; font-weight: 600; }
  td { padding: 10px 10px 10px 0; border-bottom: 1px solid var(--hair); vertical-align: top; }
  .score { font-weight: 700; font-variant-numeric: tabular-nums; }
  .pill { display: inline-block; padding: 2px 8px; border-radius: 2px; font-size: 10px;
          letter-spacing: 0.1em; text-transform: uppercase; color: #fff; }
  .finding-why { color: var(--muted); font-size: 12px; margin-top: 4px; }
  .wave { border-left: 2px solid var(--quantum); padding-left: 18px; margin: 22px 0; }
  .note { color: var(--muted); font-size: 12px; }
  .disclosure { margin-top: 44px; padding-top: 16px; border-top: 1px solid var(--hair);
                color: var(--muted); font-size: 11px; line-height: 1.6; }
  @media print {
    body { background: #fff; }
    .page { padding: 0; max-width: none; }
    h2 { page-break-after: avoid; }
    tr, .wave { page-break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="page">

  <div class="masthead">
    <div class="brand">Iron<span>bastion</span></div>
    <div class="meta">
      Quantum Security Assessment<br>
      Scan <span class="mono">${escapeHtml(scan.id)}</span><br>
      ${escapeHtml(new Date(scan.finishedAt ?? scan.startedAt).toUTCString())}
    </div>
  </div>

  <h1>${escapeHtml(input.projectName)}</h1>
  <p class="note">Cryptographic discovery, quantum risk assessment and post-quantum migration plan.</p>

  <div class="grid">
    <div class="cell">
      <div class="label">Posture</div>
      <div class="value" style="color:${SEVERITY_COLOUR[posture?.severity ?? "informational"]}">
        ${posture?.overall ?? 0}<span style="font-size:14px;color:var(--muted)">/100</span>
      </div>
      <div class="note">${escapeHtml((posture?.severity ?? "unknown").toUpperCase())}</div>
    </div>
    <div class="cell">
      <div class="label">Confirmed findings</div>
      <div class="value">${findings.length}</div>
      <div class="note">${scan.stats.needsHuman} awaiting review</div>
    </div>
    <div class="cell">
      <div class="label">Crypto assets</div>
      <div class="value">${input.cbom?.components.length ?? 0}</div>
      <div class="note">${quantumVulnerableCount(input.cbom)} quantum-vulnerable</div>
    </div>
    <div class="cell">
      <div class="label">Effort</div>
      <div class="value">${plan?.totalEffortDays ?? 0}</div>
      <div class="note">engineer-days planned</div>
    </div>
  </div>

  ${input.inventory ? `
  <h2>Inventory</h2>
  <p>${escapeHtml(input.inventory.summary)}</p>
  ${input.inventory.observations.length > 0 ? `<ul>${input.inventory.observations.map((o) => `<li>${escapeHtml(o)}</li>`).join("")}</ul>` : ""}
  ` : ""}

  <h2>Findings by risk</h2>
  <table>
    <thead>
      <tr><th style="width:52px">Risk</th><th>Finding</th><th style="width:150px">Location</th><th style="width:120px">Replacement</th></tr>
    </thead>
    <tbody>
      ${ranked
        .slice(0, 40)
        .map((finding) => {
          const evidence = finding.provenance.evidence[0];
          const where = evidence
            ? `${evidence.locator}${evidence.startLine ? `:${evidence.startLine}` : ""}`
            : finding.component;
          return `<tr>
            <td class="score" style="color:${SEVERITY_COLOUR[finding.risk.severity]}">${finding.risk.score}</td>
            <td>
              <strong>${escapeHtml(finding.title)}</strong>
              <div class="finding-why">${escapeHtml(finding.risk.explanation)}</div>
            </td>
            <td class="mono" style="font-size:11px">${escapeHtml(where)}</td>
            <td class="mono" style="font-size:11px;color:var(--quantum)">${escapeHtml(finding.recommendedAlgorithm ?? "—")}</td>
          </tr>`;
        })
        .join("")}
    </tbody>
  </table>
  ${ranked.length > 40 ? `<p class="note">${ranked.length - 40} further findings are in the JSON export.</p>` : ""}

  ${plan ? `
  <h2>Migration plan</h2>
  <p>${escapeHtml(plan.summary)}</p>
  ${plan.waves
    .map((wave) => {
      const milestone = MILESTONES.find((m) => m.id === wave.milestoneId);
      return `<div class="wave">
        <h3>${escapeHtml(wave.name)}</h3>
        <p class="note">${milestone ? `Aimed at ${milestone.year}: ${escapeHtml(milestone.title)} — ${escapeHtml(milestone.source)}` : ""}</p>
        <p>${escapeHtml(wave.rationale)}</p>
        <table>
          <thead><tr><th style="width:38px">Size</th><th>Component</th><th>Change</th><th style="width:130px">Approach</th></tr></thead>
          <tbody>
            ${wave.actions
              .map(
                (action) => `<tr>
                  <td class="mono">${action.effort}</td>
                  <td>${escapeHtml(action.component)}<div class="finding-why">${escapeHtml(action.rationale)}</div></td>
                  <td class="mono" style="font-size:11px">${escapeHtml(action.currentAlgorithm)} &rarr; <span style="color:var(--quantum)">${escapeHtml(action.targetAlgorithm)}</span></td>
                  <td class="note">${escapeHtml(action.approach)}</td>
                </tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </div>`;
    })
    .join("")}

  ${plan.milestoneRisks.length > 0 ? `
  <h3>Milestone exposure</h3>
  <table>
    <thead><tr><th>Milestone</th><th style="width:70px">At risk</th><th>Reason</th></tr></thead>
    <tbody>
      ${plan.milestoneRisks
        .map((risk) => {
          const milestone = MILESTONES.find((m) => m.id === risk.milestoneId);
          return `<tr>
            <td>${escapeHtml(milestone ? `${milestone.year} — ${milestone.title}` : risk.milestoneId)}</td>
            <td>${risk.atRisk ? '<span class="pill" style="background:#b3251f">yes</span>' : "no"}</td>
            <td class="note">${escapeHtml(risk.reason)}</td>
          </tr>`;
        })
        .join("")}
    </tbody>
  </table>` : ""}
  ` : ""}

  <h2>Method and provenance</h2>
  <p class="note">
    ${findings.length} finding(s) were produced by deterministic collectors and adjudicated
    before publication. ${modelJudged} were judged by a model; ${findings.length - modelJudged}
    were judged by rules. Risk scores are computed by a fixed formula from evidence
    — quantum exposure, data lifetime, reachability, network exposure and migration
    difficulty — and are reproducible from the JSON export of this scan.
    ${scan.stats.inputTokens > 0 ? `Model usage: ${scan.stats.inputTokens.toLocaleString()} input and ${scan.stats.outputTokens.toLocaleString()} output tokens, $${(scan.stats.costCents / 100).toFixed(2)}.` : ""}
  </p>
  ${input.notes.length > 0 ? `<ul class="note">${input.notes.map((n) => `<li>${escapeHtml(n)}</li>`).join("")}</ul>` : ""}

  <div class="disclosure">
    IronBastion is not an accredited laboratory, a certification body or a conformity
    assessment body. Standards and public reference documents cited here are the property
    of their respective owners; citation does not imply endorsement or approval. This
    report describes cryptography discovered in the scanned targets at the time of the
    scan and does not assert that the estate is free of other cryptographic risk.
  </div>
</div>
</body>
</html>`;
}

function quantumVulnerableCount(cbom?: CycloneDxBom): number {
  if (!cbom) return 0;
  return cbom.components.filter(
    (component) => component.cryptoProperties.algorithmProperties?.nistQuantumSecurityLevel === 0,
  ).length;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
