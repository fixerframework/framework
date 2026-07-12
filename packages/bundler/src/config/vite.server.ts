import { builtinModules } from "node:module";
import { defineConfig, type UserConfig } from "vite";
import { detectServerEntry, readPackageExternals } from "./package-meta.ts";
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

  const entry = entryOpt ?? detectServerEntry(cwd);
  if (!entry) {
    throw new Error(
      `[fixer-bundle] server mode: no entry found (src/server.ts|server.ts|…) in ${cwd}`,
    );
  }

  const externals = readPackageExternals(cwd);
  const builtins = new Set([...builtinModules, ...builtinModules.map((m) => `node:${m}`)]);

  return defineConfig({
    ...rest,
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
        external: (id) => {
          if (builtins.has(id)) return true;
          if (externals.has(id)) return true;
          for (const name of externals) {
            if (id === name || id.startsWith(`${name}/`)) return true;
          }
          return false;
        },
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
