import { existsSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

/** Tools this package is allowed to spawn. Never accept free-form names. */
export type KnownBin = "oxfmt" | "oxlint" | "vitest" | "vite" | "tsgo" | "tsc";

export const KNOWN_BINS: ReadonlySet<string> = new Set<KnownBin>([
  "oxfmt",
  "oxlint",
  "vitest",
  "vite",
  "tsgo",
  "tsc",
]);

function isKnownBin(name: string): name is KnownBin {
  return KNOWN_BINS.has(name);
}

function pushPackageBinCandidates(root: string, name: string, out: string[]): void {
  out.push(join(root, "bin", name));
  out.push(join(root, "bin", `${name}.js`));
  out.push(join(root, "bin", `${name}.cjs`));
  out.push(join(root, "bin", `${name}.mjs`));
  out.push(join(root, "lib", name));
  out.push(join(root, "lib", `${name}.js`));
}

/**
 * Collect candidate absolute paths for a known tool from trusted package roots only.
 * Does not search under consumer `--cwd` (user-controlled) to avoid planting executables.
 */
function collectCandidates(name: KnownBin): string[] {
  const candidates: string[] = [];

  if (name === "tsgo") {
    try {
      const pkgJson = require.resolve("@typescript/native-preview/package.json");
      const root = dirname(pkgJson);
      pushPackageBinCandidates(root, "tsgo", candidates);
    } catch {
      // package not resolvable
    }
  } else if (name === "tsc") {
    try {
      const pkgJson = require.resolve("typescript/package.json");
      const root = dirname(pkgJson);
      pushPackageBinCandidates(root, "tsc", candidates);
    } catch {
      // package not resolvable
    }
  } else {
    try {
      const pkgJson = require.resolve(`${name}/package.json`);
      const root = dirname(pkgJson);
      pushPackageBinCandidates(root, name, candidates);
    } catch {
      // package not resolvable
    }
  }

  // This package install + typical monorepo hoist from packages/bundler/src → repo root
  const here = dirname(fileURLToPath(import.meta.url));
  const bundlerRoot = resolve(here, "..");
  const monorepoRoot = resolve(bundlerRoot, "..", "..");
  for (const root of [bundlerRoot, monorepoRoot]) {
    candidates.push(join(root, "node_modules", ".bin", name));
  }

  return candidates;
}

/**
 * Resolve a binary for a known tool from trusted package roots only.
 * Returns an absolute path, or null if the name is unknown or not installed.
 */
export function resolveBin(name: string): string | null {
  if (!isKnownBin(name)) return null;

  for (const c of collectCandidates(name)) {
    const abs = isAbsolute(c) ? c : resolve(c);
    if (existsSync(abs)) return abs;
  }
  return null;
}

/**
 * Whether a resolved executable basename is one of the tools we intentionally run
 * (or a classic tsc.js entry). Used by the spawn boundary as defense in depth.
 */
export function isAllowedExecutableBasename(base: string): boolean {
  if (KNOWN_BINS.has(base)) return true;
  const stripped = base.replace(/\.(js|cjs|mjs|ts)$/i, "");
  return KNOWN_BINS.has(stripped);
}
