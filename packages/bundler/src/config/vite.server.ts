import { join, relative } from "node:path";
import { defineConfig, type UserConfig } from "vite";
import {
  detectServerEntry,
  isHostBuiltin,
  isPackageExternal,
  readPackageExternals,
} from "./package-meta.ts";
import type { ServerConfigOptions } from "./types.ts";

export function defineServerConfig(options: ServerConfigOptions = {}): UserConfig {
  const {
    entry: entryOpt,
    outDir = "dist",
    cwd = process.cwd(),
    build: buildOpt,
    oxc: oxcOpt,
    ...rest
  } = options;

  const resolvedEntry = entryOpt
    ? entryOpt.startsWith("/")
      ? entryOpt
      : join(cwd, entryOpt)
    : detectServerEntry(cwd);

  if (!resolvedEntry) {
    throw new Error(
      `[fixer-bundle] server mode: no entry found (src/server.ts|server.ts|…) in ${cwd}`,
    );
  }

  const externals = readPackageExternals(cwd);
  const entry = relative(cwd, resolvedEntry) || resolvedEntry;

  return defineConfig({
    ...rest,
    root: cwd,
    build: {
      outDir,
      emptyOutDir: true,
      ssr: true,
      lib: {
        entry,
        formats: ["es"],
        fileName: "server",
      },
      rollupOptions: {
        external: (id) => isHostBuiltin(id) || isPackageExternal(id, externals),
      },
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
