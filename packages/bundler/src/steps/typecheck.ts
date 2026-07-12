import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { CliOptions, StepResult } from "../types.ts";
import { resolveBin } from "../resolve-bin.ts";
import { runCommand } from "../run.ts";

/**
 * Prefer the full package tsconfig for quality gates (includes tests when configured).
 * Fall back to tsconfig.build.json only when no base config exists.
 * DTS emit still uses tsconfig.build.json in the build step.
 */
export function typecheckProjectArgs(cwd: string): string[] {
  const base = join(cwd, "tsconfig.json");
  const build = join(cwd, "tsconfig.build.json");
  if (existsSync(base)) return ["-p", "tsconfig.json"];
  if (existsSync(build)) return ["-p", "tsconfig.build.json"];
  return [];
}

/**
 * TypeScript 7+ ships `tsc` as a thin JS shim that resolves `@typescript/typescript-<platform>`.
 * Prefer tsgo only in that case; do not treat the broken shim as a real fallback.
 * Classic typescript (≤5.x) `bin/tsc` / `lib/tsc.js` is the real compiler and is fine to use.
 */
export function isTsPlatformShim(tscPath: string): boolean {
  try {
    const head = readFileSync(tscPath, "utf8").slice(0, 500);
    return head.includes("getExePath") || /import\s+["']\.\.\/lib\/tsc\.js["']/.test(head);
  } catch {
    return false;
  }
}

export async function runTypecheck(options: CliOptions): Promise<StepResult> {
  const project = typecheckProjectArgs(options.cwd);
  const tsgo = resolveBin("tsgo");
  if (tsgo) {
    const result = await runCommand({
      command: tsgo,
      args: ["--noEmit", ...project],
      cwd: options.cwd,
    });
    // Do not fall back to tsc when tsgo returns type errors — only when missing.
    return { name: "typecheck", code: result.code };
  }

  const tsc = resolveBin("tsc");
  if (!tsc) {
    console.error("[fixer-bundle] neither tsgo nor tsc found");
    return { name: "typecheck", code: 1 };
  }

  if (isTsPlatformShim(tsc)) {
    console.error(
      "[fixer-bundle] tsgo not found. TypeScript 7's tsc is a platform shim " +
        "(@typescript/typescript-*) and is not used as a fallback. " +
        "Install @typescript/native-preview (tsgo) or a classic tsc binary.",
    );
    return { name: "typecheck", code: 1 };
  }

  // Classic tsc.js needs node/bun; if path ends with .js, run via process.execPath
  const isJs = tsc.endsWith(".js");
  const result = await runCommand({
    command: isJs ? process.execPath : tsc,
    args: isJs ? [tsc, "--noEmit", ...project] : ["--noEmit", ...project],
    cwd: options.cwd,
  });

  if (result.code !== 0) {
    console.error(
      "[fixer-bundle] tsc failed. If you see platform package errors " +
        "(e.g. Unable to resolve @typescript/typescript-*), install " +
        "@typescript/native-preview (tsgo) or the matching platform package.",
    );
  }

  return { name: "typecheck", code: result.code };
}
