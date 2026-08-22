import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const at = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@ironbastion/core": at("packages/core/src/index.ts"),
      "@ironbastion/collectors": at("packages/collectors/src/index.ts"),
      "@ironbastion/cbom": at("packages/cbom/src/index.ts"),
      "@ironbastion/risk": at("packages/risk/src/index.ts"),
      "@ironbastion/agents": at("packages/agents/src/index.ts"),
      "@ironbastion/db": at("packages/db/src/index.ts"),
      "@ironbastion/runner": at("packages/runner/src/index.ts"),
    },
  },
  test: {
    globals: true,
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts", "apps/**/*.test.tsx"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    testTimeout: 30_000,
  },
});
