import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { LibEntry } from "./types.ts";

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
  };
  for (const key of Object.keys(pkg.dependencies ?? {})) names.add(key);
  for (const key of Object.keys(pkg.peerDependencies ?? {})) names.add(key);
  return names;
}

export function findLocalViteConfig(cwd: string): string | null {
  const files = ["vite.config.ts", "vite.config.mts", "vite.config.js", "vite.config.mjs"];
  for (const f of files) {
    const p = join(cwd, f);
    if (existsSync(p)) return p;
  }
  return null;
}
