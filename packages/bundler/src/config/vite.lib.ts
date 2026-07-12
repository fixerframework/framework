import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { defineConfig, type Plugin, type UserConfig } from "vite";
import {
  isHostBuiltin,
  isPackageExternal,
  readPackageExternals,
  resolveLibEntry,
} from "./package-meta.ts";
import type { CopyAsset, LibConfigOptions } from "./types.ts";

function copyAssetsPlugin(cwd: string, outDir: string, assets: CopyAsset[]): Plugin {
  return {
    name: "fixer-bundle-copy-assets",
    closeBundle() {
      for (const asset of assets) {
        const from = join(cwd, asset.from);
        const to = join(cwd, outDir, asset.to);
        mkdirSync(dirname(to), { recursive: true });
        copyFileSync(from, to);
      }
    },
  };
}

function shebangPlugin(binEntry: string): Plugin {
  return {
    name: "fixer-bundle-shebang",
    generateBundle(_opts, bundle) {
      const expected = `${binEntry}.js`;
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type !== "chunk") continue;
        if (fileName === expected || fileName.endsWith(`/${expected}`) || chunk.name === binEntry) {
          if (!chunk.code.startsWith("#!")) {
            chunk.code = `#!/usr/bin/env node\n${chunk.code}`;
          }
        }
      }
    },
  };
}

export function defineLibConfig(options: LibConfigOptions = {}): UserConfig {
  const {
    entry: entryOpt,
    outDir = "dist",
    cwd = process.cwd(),
    copy = [],
    binEntry,
    build: buildOpt,
    oxc: oxcOpt,
    plugins: pluginsOpt,
    ...rest
  } = options;

  const entry = resolveLibEntry(cwd, entryOpt);
  if (!entry) {
    throw new Error(`[fixer-bundle] lib mode: no entry found (index.ts or src/index.ts) in ${cwd}`);
  }

  const externals = readPackageExternals(cwd);
  const isMulti = typeof entry === "object";

  const plugins: Plugin[] = [];
  if (copy.length > 0) {
    plugins.push(copyAssetsPlugin(cwd, outDir, copy));
  }
  if (binEntry) {
    plugins.push(shebangPlugin(binEntry));
  }
  if (pluginsOpt) {
    plugins.push(...(pluginsOpt as Plugin[]));
  }

  // Keep entry paths relative to cwd when possible so Vite root resolution is stable.
  const libEntry =
    typeof entry === "string"
      ? relative(cwd, entry) || entry
      : Object.fromEntries(
          Object.entries(entry).map(([name, abs]) => [name, relative(cwd, abs) || abs]),
        );

  const defaultLib = {
    entry: libEntry,
    formats: ["es" as const],
    fileName: isMulti ? (_format: string, entryName: string) => `${entryName}.js` : "index",
  };
  const defaultRollupOptions = {
    external: (id: string) => isHostBuiltin(id) || isPackageExternal(id, externals),
  };

  return defineConfig({
    ...rest,
    root: cwd,
    plugins,
    build: {
      outDir,
      emptyOutDir: true,
      ...buildOpt,
      // Keep lib/rollup defaults unless the consumer explicitly overrides those keys.
      lib: buildOpt?.lib ?? defaultLib,
      rollupOptions: buildOpt?.rollupOptions ?? defaultRollupOptions,
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
