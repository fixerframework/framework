import { existsSync } from "node:fs";
import { join } from "node:path";
import { defineConfig, type UserConfig } from "vite";
import type { AppConfigOptions } from "./types.ts";

export function defineAppConfig(options: AppConfigOptions = {}): UserConfig {
  const { outDir = "dist", cwd = process.cwd(), build: buildOpt, oxc: oxcOpt, ...rest } = options;

  const indexHtml = join(cwd, "index.html");
  if (!existsSync(indexHtml)) {
    throw new Error(`[fixer-bundle] app mode: no index.html found in ${cwd}`);
  }

  return defineConfig({
    ...rest,
    root: cwd,
    build: {
      outDir,
      emptyOutDir: true,
      ...buildOpt,
    },
    oxc: {
      jsx: {
        runtime: "automatic",
        importSource: "preact",
      },
      ...oxcOpt,
    },
  }) as UserConfig;
}
