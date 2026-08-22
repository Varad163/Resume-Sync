/**
 * One command for the whole platform.
 *
 * Starts the API with the inline worker and an embedded PostgreSQL, seeds the
 * demo tenant, and serves the console with the API proxied on the same origin.
 * No Docker, no AWS account, no configuration.
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("..", import.meta.url));
const API_PORT = process.env.PORT ?? "8787";
const CONSOLE_PORT = "5199";

const children = [];

function start(name, command, args, env) {
  const child = spawn(command, args, {
    cwd: repo,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const prefix = `[${name}]`.padEnd(10);
  const relay = (stream, sink) => {
    let buffer = "";
    stream.on("data", (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) sink.write(`${prefix} ${line}\n`);
    });
  };
  relay(child.stdout, process.stdout);
  relay(child.stderr, process.stderr);
  child.on("exit", (code) => {
    if (code !== 0 && code !== null) process.stderr.write(`${prefix} exited with ${code}\n`);
  });
  children.push(child);
  return child;
}

start("api", "npx", ["tsx", "apps/api/src/main.ts"], {
  PORT: API_PORT,
  IRONBASTION_AUTH: "dev",
  IRONBASTION_INLINE_WORKER: "1",
  IRONBASTION_SEED: "1",
});

start("console", "npx", ["vite", "--config", "apps/console/vite.config.mts"], {
  API_ORIGIN: `http://localhost:${API_PORT}`,
});

setTimeout(() => {
  process.stdout.write(
    [
      "",
      "  ────────────────────────────────────────────────",
      `  Console   http://localhost:${CONSOLE_PORT}`,
      `  API       http://localhost:${API_PORT}`,
      "  ────────────────────────────────────────────────",
      "",
    ].join("\n") + "\n",
  );
}, 2500);

const stop = () => {
  for (const child of children) child.kill("SIGTERM");
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
