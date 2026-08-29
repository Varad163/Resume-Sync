/**
 * Getting the source onto disk.
 *
 * Clones are shallow, single-branch, into a directory the worker owns and
 * deletes when the scan ends. Credentials are passed through an askpass helper
 * rather than embedded in the URL, so a token never reaches the process table,
 * a log line, or `.git/config`.
 */

import { mkdtemp, rm, writeFile, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

export interface CheckoutResult {
  readonly path: string;
  readonly cleanup: () => Promise<void>;
}

export interface CheckoutOptions {
  readonly remoteUrl: string;
  readonly ref?: string;
  /** Short-lived installation token. Never persisted. */
  readonly token?: string;
  readonly depth?: number;
  readonly timeoutMs?: number;
}

export async function checkout(options: CheckoutOptions): Promise<CheckoutResult> {
  const root = await mkdtemp(path.join(tmpdir(), "ironbastion-scan-"));
  const workdir = path.join(root, "repo");
  const cleanup = async () => {
    await rm(root, { recursive: true, force: true });
  };

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    GIT_TERMINAL_PROMPT: "0",
    GIT_CONFIG_NOSYSTEM: "1",
  };

  let askpass: string | undefined;
  if (options.token) {
    askpass = path.join(root, "askpass.sh");
    await writeFile(askpass, `#!/bin/sh\ncase "$1" in\n  Username*) echo "x-access-token" ;;\n  *) echo "$IRONBASTION_GIT_TOKEN" ;;\nesac\n`);
    await chmod(askpass, 0o700);
    env["GIT_ASKPASS"] = askpass;
    env["IRONBASTION_GIT_TOKEN"] = options.token;
  }

  const args = [
    "clone",
    "--depth",
    String(options.depth ?? 1),
    "--single-branch",
    "--no-tags",
    ...(options.ref ? ["--branch", options.ref] : []),
    options.remoteUrl,
    workdir,
  ];

  try {
    await run("git", args, env, options.timeoutMs ?? 300_000);
  } catch (error) {
    await cleanup();
    throw error;
  }

  return { path: workdir, cleanup };
}

function run(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
  timeoutMs: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`${command} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      // Redact anything token-shaped before the message goes anywhere.
      else reject(new Error(`${command} exited ${code}: ${redact(stderr).slice(0, 500)}`));
    });
  });
}

export function redact(text: string): string {
  return text
    .replace(/gh[pousr]_[A-Za-z0-9]{20,}/g, "[redacted-token]")
    .replace(/x-access-token:[^@\s]+/g, "x-access-token:[redacted]")
    .replace(/:\/\/[^@/\s]+@/g, "://[redacted]@");
}

function capture(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
  timeoutMs: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`${command} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(`${command} exited ${code}: ${redact(stderr).slice(0, 500)}`));
    });
  });
}

export async function resolveRemoteHead(options: {
  remoteUrl: string;
  ref?: string;
  token?: string;
  timeoutMs?: number;
}): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "ironbastion-lsremote-"));
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    GIT_TERMINAL_PROMPT: "0",
    GIT_CONFIG_NOSYSTEM: "1",
  };

  let askpass: string | undefined;
  if (options.token) {
    askpass = path.join(root, "askpass.sh");
    await writeFile(askpass, `#!/bin/sh\ncase "$1" in\n  Username*) echo "x-access-token" ;;\n  *) echo "$IRONBASTION_GIT_TOKEN" ;;\nesac\n`);
    await chmod(askpass, 0o700);
    env["GIT_ASKPASS"] = askpass;
    env["IRONBASTION_GIT_TOKEN"] = options.token;
  }

  const refTarget = options.ref ?? "HEAD";
  const args = ["ls-remote", options.remoteUrl, refTarget];

  try {
    const output = await capture("git", args, env, options.timeoutMs ?? 60_000);
    const lines = output.split("\n").filter((l) => l.trim().length > 0);
    if (lines.length === 0) {
      throw new Error(`ls-remote returned no references for ${redact(options.remoteUrl)}`);
    }
    const parts = lines[0]!.split(/\s+/);
    const sha = parts[0]!;
    if (!/^[0-9a-f]{40}$/i.test(sha)) {
      throw new Error(`ls-remote returned invalid commit SHA: ${sha}`);
    }
    return sha;
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

export async function resolveLocalCommit(workdir: string): Promise<{ sha: string; message: string }> {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    GIT_CONFIG_NOSYSTEM: "1",
  };

  const [sha, message] = await Promise.all([
    capture("git", ["-C", workdir, "rev-parse", "HEAD"], env, 10_000),
    capture("git", ["-C", workdir, "log", "-1", "--format=%s"], env, 10_000),
  ]);

  return { sha, message };
}
