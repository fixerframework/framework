/**
 * Rewrite .ts(x) import paths in emitted .d.ts files to .js for consumers.
 * Used by the bundler's own self-build (other packages get this via fixer-bundle).
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const distDir = join(import.meta.dirname, "..", "dist");

function walk(dir: string): void {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      walk(full);
      continue;
    }
    if (!name.endsWith(".d.ts")) continue;
    const src = readFileSync(full, "utf8");
    const next = src
      .replace(/(from\s+["'])([^"']+)\.tsx?(["'])/g, "$1$2.js$3")
      .replace(/(import\s*\(\s*["'])([^"']+)\.tsx?(["'])/g, "$1$2.js$3")
      .replace(/(export\s+\*\s+from\s+["'])([^"']+)\.tsx?(["'])/g, "$1$2.js$3");
    if (next !== src) writeFileSync(full, next);
  }
}

walk(distDir);
