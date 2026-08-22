/**
 * The scan worker.
 *
 * Long-polls the queue, runs one campaign at a time, and acknowledges only
 * after the scan is recorded. A task that dies mid-scan leaves the message
 * invisible until the visibility timeout expires, at which point another worker
 * picks it up — so a crashed worker costs time, not a lost scan.
 */

import { createDatabase, migrate } from "@ironbastion/db";
import { createQueue, executeScan } from "@ironbastion/runner";
import {
  configuredProvider,
  createAwsClient,
  createDirectClient,
  type ModelClient,
} from "@ironbastion/agents";

let shuttingDown = false;

async function main(): Promise<void> {
  const db = await createDatabase();
  await migrate(db);

  const queue = await createQueue();
  const client = await modelClient();

  log(`worker up: queue ${queue.id}, model ${client?.id ?? "rule-based fallback"}`);

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      log(`${signal} received; finishing the current scan then stopping`);
      shuttingDown = true;
    });
  }

  while (!shuttingDown) {
    let received: Awaited<ReturnType<typeof queue.receive>>;
    try {
      received = await queue.receive(1);
    } catch (error) {
      log(`receive failed: ${(error as Error).message}`);
      await sleep(5000);
      continue;
    }

    if (received.length === 0) {
      // The in-process queue does not block, so do not spin on it.
      if (queue.id === "in-process") await sleep(1000);
      continue;
    }

    for (const { message, ack } of received) {
      log(`starting ${message.scanId}`);
      await executeScan({ db, scanId: message.scanId, client, log });
      // executeScan records its own failures, so the message is done either way.
      await ack();
    }
  }

  await queue.close();
  await db.close();
  log("worker stopped");
}

async function modelClient(): Promise<ModelClient | null> {
  const provider = configuredProvider();
  try {
    if (provider === "aws") return await createAwsClient();
    if (provider === "anthropic") return await createDirectClient();
  } catch (error) {
    log(`model client unavailable: ${(error as Error).message}`);
  }
  return null;
}

function log(message: string): void {
  process.stdout.write(`${new Date().toISOString()} ${message}\n`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error: unknown) => {
  process.stderr.write(`worker: ${(error as Error).stack ?? String(error)}\n`);
  process.exit(1);
});
