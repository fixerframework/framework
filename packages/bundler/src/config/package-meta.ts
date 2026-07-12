import { existsSync, readFileSync } from "node:fs";
import { builtinModules } from "node:module";
import { join } from "node:path";
import type { LibEntry } from "./types.ts";

const HOST_BUILTINS = new Set<string>([
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
]);

export function detectLibEntry(cwd: string): string | null {
  const candidates = [join(cwd, "index.ts"), join(cwd, "src", "index.ts")];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

/**
 * Resolve lib entry to an absolute path or absolute multi-entry map.
 * Default: single detected entry named `index`.
 */
export function resolveLibEntry(
  cwd: string,
  entry?: LibEntry,
): string | Record<string, string> | null {
  if (entry === undefined) {
    const detected = detectLibEntry(cwd);
    if (!detected) return null;
    return detected;
  }
  if (typeof entry === "string") {
    return entry.startsWith("/") ? entry : join(cwd, entry);
  }
  const mapped: Record<string, string> = {};
  for (const [name, path] of Object.entries(entry)) {
    mapped[name] = path.startsWith("/") ? path : join(cwd, path);
  }
  return mapped;
}

export function detectServerEntry(cwd: string): string | null {
  const candidates = [
    join(cwd, "src", "server.ts"),
    join(cwd, "server.ts"),
    join(cwd, "src", "index.ts"),
    join(cwd, "index.ts"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

export function readPackageExternals(cwd: string): Set<string> {
  const pkgPath = join(cwd, "package.json");
  const names = new Set<string>();
  if (!existsSync(pkgPath)) return names;
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
    dependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
  };
  for (const key of Object.keys(pkg.dependencies ?? {})) names.add(key);
  for (const key of Object.keys(pkg.peerDependencies ?? {})) names.add(key);
  for (const key of Object.keys(pkg.optionalDependencies ?? {})) names.add(key);
  return names;
}

/**
 * Whether a module id is a Node/Bun host builtin that must stay external in lib/server builds.
 */
export function isHostBuiltin(id: string): boolean {
  if (id.startsWith("node:") || id.startsWith("bun:")) return true;
  if (HOST_BUILTINS.has(id)) return true;
  // Subpaths like fs/promises
  const slash = id.indexOf("/");
  if (slash > 0 && HOST_BUILTINS.has(id.slice(0, slash))) return true;
  return false;
}

export function isPackageExternal(id: string, externals: Set<string>): boolean {
  if (externals.has(id)) return true;
  for (const name of externals) {
    if (id === name || id.startsWith(`${name}/`)) return true;
  }
  return false;
}

export function findLocalViteConfig(cwd: string): string | null {
  const files = ["vite.config.ts", "vite.config.mts", "vite.config.js", "vite.config.mjs"];
  for (const f of files) {
    const p = join(cwd, f);
    if (existsSync(p)) return p;
  }
  return null;
}
