/**
 * Bundles an app into a single file for its container image. Bundling keeps the
 * runtime image to node plus one script — no workspace symlinks to resolve, no
 * install step at deploy time.
 */
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("..", import.meta.url));
const app = process.argv[2];
if (!app) throw new Error("usage: node scripts/bundle.mjs <api|worker>");

const alias = Object.fromEntries(
  ["core", "collectors", "cbom", "risk", "agents", "db", "runner"].map((name) => [
    `@ironbastion/${name}`,
    `${repo}packages/${name}/src/index.ts`,
  ]),
);

await build({
  entryPoints: [`${repo}apps/${app}/src/main.ts`],
  outfile: `${repo}apps/${app}/dist/main.js`,
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  sourcemap: true,
  alias,
  // Native and lazily-required modules stay external and are installed in the image.
  external: ["pg", "pg-native", "@electric-sql/pglite", "@aws-sdk/*", "@anthropic-ai/*"],
  banner: {
    js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);",
  },
  loader: { ".sql": "text" },
  logLevel: "info",
});
