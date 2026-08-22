#!/usr/bin/env node
/**
 * `ironbastion scan` — the whole engine, without the platform.
 *
 * This is the same campaign the hosted worker runs. It exists so the analysis
 * can be developed, demonstrated and audited on a laptop, and so a prospect can
 * be shown a real result on their own repository without signing anything.
 */

import { parseArgs } from "node:util";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { DEFAULT_SCAN_OPTIONS, EMPTY_STATS, newId, type ScanRecord, type ScanTarget } from "@ironbastion/core";
import {
  configuredProvider,
  createAwsClient,
  createDirectClient,
  runCampaign,
  type ModelClient,
} from "@ironbastion/agents";
import { renderReport } from "./render.js";

const USAGE = `
ironbastion scan <repository-path> [options]

  --tls <host[:port]>     Also probe a TLS endpoint. Repeatable.
  --metadata-only         Send no source text to the model.
  --budget <cents>        Model spend ceiling for this scan. Default ${DEFAULT_SCAN_OPTIONS.budgetCents}.
  --provider <name>       aws | anthropic | deterministic. Default: auto-detect.
  --json <file>           Write the full result as JSON.
  --cbom <file>           Write the CycloneDX CBOM.
  --quiet                 Progress off.

Model access is auto-detected: Claude Platform on AWS when AWS_REGION and
ANTHROPIC_AWS_WORKSPACE_ID are set, the Anthropic API when ANTHROPIC_API_KEY is
set, and the rule-based fallback otherwise. The fallback is clearly marked in
the output — it is not a model verdict.
`;

async function main(): Promise<number> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      tls: { type: "string", multiple: true },
      "metadata-only": { type: "boolean" },
      budget: { type: "string" },
      provider: { type: "string" },
      json: { type: "string" },
      cbom: { type: "string" },
      quiet: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help || positionals[0] !== "scan" || !positionals[1]) {
    process.stdout.write(USAGE);
    return values.help ? 0 : 1;
  }

  const repoPath = path.resolve(positionals[1]);
  const targets: ScanTarget[] = [
    {
      kind: "git-repository",
      id: newId("repo"),
      name: path.basename(repoPath),
      localPath: repoPath,
    },
  ];

  for (const endpoint of values.tls ?? []) {
    const [host = "", port] = endpoint.split(":");
    targets.push({
      kind: "tls-endpoint",
      id: newId("ep"),
      host,
      port: port ? Number.parseInt(port, 10) : 443,
      serverName: host,
    });
  }

  const scan: ScanRecord = {
    id: newId("scan"),
    tenantId: "local",
    projectId: "local",
    status: "running",
    phase: "DISCOVER",
    targets,
    options: {
      ...DEFAULT_SCAN_OPTIONS,
      metadataOnly: values["metadata-only"] === true,
      budgetCents: values.budget ? Number.parseInt(values.budget, 10) : DEFAULT_SCAN_OPTIONS.budgetCents,
    },
    startedAt: new Date().toISOString(),
    stats: EMPTY_STATS,
  };

  const provider = (values.provider as ReturnType<typeof configuredProvider>) ?? configuredProvider();
  const client = await createClient(provider);
  const log = values.quiet ? undefined : (message: string) => process.stderr.write(`  ${message}\n`);

  if (!values.quiet) {
    process.stderr.write(`\n  scanning ${repoPath}\n`);
    process.stderr.write(`  model provider: ${client ? client.id : "none (rule-based fallback)"}\n\n`);
  }

  const result = await runCampaign({
    scan,
    client,
    projectName: path.basename(repoPath),
    ...(log ? { log } : {}),
    ...(values.quiet ? {} : { onPhase: (phase) => process.stderr.write(`  [${phase}]\n`) }),
  });

  process.stdout.write(renderReport(result));

  if (values.json) {
    await writeFile(values.json, JSON.stringify(result, null, 2));
    process.stderr.write(`  wrote ${values.json}\n`);
  }
  if (values.cbom) {
    await writeFile(values.cbom, JSON.stringify(result.cbom, null, 2));
    process.stderr.write(`  wrote ${values.cbom}\n`);
  }

  // A critical posture is a failing build, so this can gate a pipeline.
  return result.posture.severity === "critical" ? 2 : 0;
}

async function createClient(provider: string): Promise<ModelClient | null> {
  try {
    if (provider === "aws") return await createAwsClient();
    if (provider === "anthropic") return await createDirectClient();
  } catch (error) {
    process.stderr.write(`  model client unavailable (${(error as Error).message}); using rules\n`);
  }
  return null;
}

main()
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    process.stderr.write(`\nironbastion: ${(error as Error).message}\n`);
    process.exit(1);
  });
