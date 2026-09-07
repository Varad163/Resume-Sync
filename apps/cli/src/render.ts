/** Terminal rendering for a completed campaign. */

import type { CampaignResult } from "@ironbastion/agents";
import { MILESTONES, type Severity } from "@ironbastion/core";

const ESC = "\u001b";
const COLOURS = {
  reset: `${ESC}[0m`,
  bold: `${ESC}[1m`,
  cyan: `${ESC}[36m`,
  amber: `${ESC}[33m`,
  red: `${ESC}[31m`,
  grey: `${ESC}[90m`,
};

const useColour = process.stdout.isTTY && !process.env["NO_COLOR"];
const paint = (code: string, text: string) => (useColour ? `${code}${text}${COLOURS.reset}` : text);

const SEVERITY_COLOUR: Record<Severity, string> = {
  critical: COLOURS.red,
  high: COLOURS.amber,
  medium: COLOURS.amber,
  low: COLOURS.cyan,
  informational: COLOURS.grey,
};

export function renderReport(result: CampaignResult): string {
  const lines: string[] = [];
  const rule = "-".repeat(72);

  lines.push("");
  lines.push(paint(COLOURS.cyan + COLOURS.bold, "IRONBASTION - QUANTUM SECURITY ASSESSMENT"));
  lines.push(paint(COLOURS.grey, rule));

  // ------------------------------------------------------------- posture
  const posture = result.posture;
  lines.push("");
  lines.push(
    `  ${paint(COLOURS.bold, "Posture   ")} ${paint(SEVERITY_COLOUR[posture.severity], `${posture.overall}/100 ${posture.severity.toUpperCase()}`)}`,
  );
  lines.push(
    `  ${paint(COLOURS.bold, "Findings  ")} ${result.findings.length} confirmed, ${result.needsHuman.length} awaiting human review, ${result.scan.stats.findingsRejected} rejected`,
  );
  lines.push(
    `  ${paint(COLOURS.bold, "Inventory ")} ${result.cbom.components.length} cryptographic assets across ${new Set(result.findings.map((f) => f.component)).size} components`,
  );
  lines.push(
    `  ${paint(COLOURS.bold, "Judged by ")} ${result.modelJudged} by model, ${result.ruleJudged} by rules`,
  );
  if (result.scan.stats.costCents > 0) {
    lines.push(
      `  ${paint(COLOURS.bold, "Model cost")} $${(result.scan.stats.costCents / 100).toFixed(3)} (${result.scan.stats.inputTokens.toLocaleString()} in / ${result.scan.stats.outputTokens.toLocaleString()} out)`,
    );
  }

  // ---------------------------------------------------------- severities
  lines.push("");
  const counts = posture.counts;
  const summary = (["critical", "high", "medium", "low", "informational"] as Severity[])
    .filter((severity) => counts[severity] > 0)
    .map((severity) => paint(SEVERITY_COLOUR[severity], `${severity} ${counts[severity]}`))
    .join(paint(COLOURS.grey, "   "));
  if (summary) lines.push(`  ${summary}`);

  // ----------------------------------------------------------- inventory
  lines.push("");
  lines.push(paint(COLOURS.grey, rule));
  lines.push(paint(COLOURS.bold, "  INVENTORY"));
  lines.push("");
  lines.push(wrap(result.inventory.summary, 68, "  "));
  for (const observation of result.inventory.observations) {
    lines.push("");
    lines.push(wrap(`- ${observation}`, 68, "  "));
  }

  // ------------------------------------------------------------ findings
  lines.push("");
  lines.push(paint(COLOURS.grey, rule));
  lines.push(paint(COLOURS.bold, "  TOP FINDINGS"));
  lines.push("");

  const top = [...result.findings].sort((a, b) => b.risk.score - a.risk.score).slice(0, 10);
  for (const finding of top) {
    const evidence = finding.provenance.evidence[0];
    const where = evidence
      ? `${evidence.locator}${evidence.startLine ? `:${evidence.startLine}` : ""}`
      : finding.component;
    lines.push(
      `  ${paint(SEVERITY_COLOUR[finding.risk.severity], String(finding.risk.score).padStart(3))} ${paint(COLOURS.bold, finding.title)}`,
    );
    lines.push(paint(COLOURS.grey, `      ${where}`));
    if (finding.recommendedAlgorithm) {
      lines.push(
        `      ${paint(COLOURS.grey, "replace with")} ${paint(COLOURS.cyan, finding.recommendedAlgorithm)}`,
      );
    }
    lines.push("");
  }

  // ---------------------------------------------------------------- plan
  lines.push(paint(COLOURS.grey, rule));
  lines.push(paint(COLOURS.bold, "  MIGRATION PLAN"));
  lines.push("");
  lines.push(wrap(result.plan.summary, 68, "  "));
  lines.push("");
  lines.push(
    paint(
      COLOURS.grey,
      `  ~${result.plan.totalEffortDays} days estimated across ${result.plan.waves.length} wave(s)`,
    ),
  );
  lines.push("");

  for (const wave of result.plan.waves) {
    const milestone = MILESTONES.find((m) => m.id === wave.milestoneId);
    lines.push(
      `  ${paint(COLOURS.cyan, wave.name)} ${paint(COLOURS.grey, milestone ? `-> ${milestone.year} ${milestone.title}` : "")}`,
    );
    for (const action of wave.actions.slice(0, 6)) {
      lines.push(
        `    ${paint(COLOURS.grey, action.effort.padEnd(3))} ${action.component}: ${action.currentAlgorithm} -> ${paint(COLOURS.cyan, action.targetAlgorithm)} ${paint(COLOURS.grey, `(${action.approach})`)}`,
      );
    }
    if (wave.actions.length > 6) {
      lines.push(paint(COLOURS.grey, `    ... and ${wave.actions.length - 6} more action(s)`));
    }
    lines.push("");
  }

  // --------------------------------------------------------------- notes
  if (result.notes.length > 0) {
    lines.push(paint(COLOURS.grey, rule));
    lines.push(paint(COLOURS.bold, "  NOTES"));
    lines.push("");
    for (const note of result.notes.slice(0, 8)) {
      lines.push(wrap(`- ${note}`, 68, "  "));
    }
    lines.push("");
  }

  lines.push(paint(COLOURS.grey, rule));
  lines.push(
    paint(
      COLOURS.grey,
      "  Every finding traces to a collector rule and an adjudication.\n  Scores are computed from evidence, never written by a model.",
    ),
  );
  lines.push("");

  return lines.join("\n");
}

function wrap(text: string, width: number, indent: string): string {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + word).length > width) {
      lines.push(indent + current.trim());
      current = "";
    }
    current += `${word} `;
  }
  if (current.trim()) lines.push(indent + current.trim());
  return lines.join("\n");
}
