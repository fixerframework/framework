import { defineLibConfig } from "./src/config/vite.lib.ts";

/**
 * Self-build config for @fixerframework/bundler.
 * Built with Vite directly (chicken-and-egg); other packages use fixer-bundle.
 */
export default defineLibConfig({
  entry: {
    index: "./src/index.ts",
    "vite/lib": "./src/config/vite.lib.ts",
    "vite/app": "./src/config/vite.app.ts",
    "vite/server": "./src/config/vite.server.ts",
    vitest: "./src/config/vitest.ts",
    cli: "./src/cli-entry.ts",
  },
  binEntry: "cli",
});
