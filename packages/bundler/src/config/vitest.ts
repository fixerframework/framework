import { defineConfig } from "vitest/config";
import type { VitestConfigOptions } from "./types.ts";

export function defineVitestConfig(options: VitestConfigOptions = {}) {
  const { test: testOpt, oxc: oxcOpt, ...rest } = options;

  return defineConfig({
    ...rest,
    oxc: {
      jsx: {
        runtime: "automatic",
        importSource: "preact",
      },
      ...oxcOpt,
    },
    test: {
      environment: "node",
      include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
      ...testOpt,
    },
  });
}
