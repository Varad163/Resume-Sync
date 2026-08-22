/**
 * API entry point.
 *
 * In AWS this process serves the API and nothing else; scans are consumed by
 * the worker service. Locally, setting IRONBASTION_INLINE_WORKER=1 drains the
 * in-process queue in the same process, so the entire platform runs with one
 * command and no infrastructure.
 */

import { createDatabase, migrate, upsertUser, createProject, listProjects } from "@ironbastion/db";
import { createInProcessQueue, createQueue, executeScan, type Queue } from "@ironbastion/runner";
import { configuredProvider, createAwsClient, createDirectClient, createSimulatedClient, type ModelClient } from "@ironbastion/agents";
import path from "node:path";
import { createAuthenticator } from "./auth.js";
import { createServer } from "./server.js";

const PORT = Number.parseInt(process.env["PORT"] ?? "8787", 10);
const HOST = process.env["HOST"] ?? "0.0.0.0";

async function main(): Promise<void> {
  const db = await createDatabase();
  await migrate(db);

  const inline = process.env["IRONBASTION_INLINE_WORKER"] === "1";
  const client = await modelClient();

  let queue: Queue;
  if (inline) {
    queue = createInProcessQueue((message) => {
      // Fire and forget: the request returns 202 and the scan runs behind it.
      void executeScan({
        db,
        scanId: message.scanId,
        client,
        log: (line) => process.stdout.write(`  [worker] ${line}\n`),
      });
    });
  } else {
    queue = await createQueue();
  }

  if (process.env["IRONBASTION_SEED"] === "1") await seed(db);

  const app = await createServer({ db, queue, auth: createAuthenticator() });
  await app.listen({ port: PORT, host: HOST });

  process.stdout.write(
    [
      "",
      `  IronBastion API      http://localhost:${PORT}`,
      `  auth mode            ${createAuthenticator().mode}`,
      `  queue                ${inline ? "in-process (inline worker)" : queue.id}`,
      `  model provider       ${client?.id ?? "none (rule-based fallback)"}`,
      "",
    ].join("\n"),
  );

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      void (async () => {
        await app.close();
        await queue.close();
        await db.close();
        process.exit(0);
      })();
    });
  }
}

async function modelClient(): Promise<ModelClient | null> {
  const provider = configuredProvider();
  try {
    if (provider === "aws") return await createAwsClient();
    if (provider === "anthropic") return await createDirectClient();
    if (provider === "simulated") return createSimulatedClient();
  } catch (error) {
    process.stderr.write(`  model client unavailable: ${(error as Error).message}\n`);
  }
  return null;
}

/** A demo tenant with the bundled fixture repository, for local runs. */
async function seed(db: Awaited<ReturnType<typeof createDatabase>>): Promise<void> {
  const tenantId = "tnt_demo";
  const existing = await listProjects(db, tenantId);
  if (existing.length > 0) return;

  await db.query("INSERT INTO tenants (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING", [
    tenantId,
    "Acme Payments (demo)",
  ]);
  await upsertUser(db, {
    tenantId,
    email: "demo@ironbastion.ai",
    name: "Demo",
    role: "owner",
  });

  const fixture = path.resolve(process.cwd(), "fixtures/java-payments");
  await createProject(db, {
    tenantId,
    name: "acme-payments",
    description: "Java payments platform: token vault, settlement signing, legacy ledger, gateway.",
    targets: [
      { kind: "git-repository", id: "repo_demo", name: "acme-payments", localPath: fixture },
    ],
  });

  process.stdout.write(`  seeded demo tenant ${tenantId} with fixture ${fixture}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`api: ${(error as Error).stack ?? String(error)}\n`);
  process.exit(1);
});
