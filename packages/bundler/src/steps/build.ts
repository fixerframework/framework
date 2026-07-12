import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { build as viteBuild } from "vite";
import { defineAppConfig } from "../config/vite.app.ts";
import { defineLibConfig } from "../config/vite.lib.ts";
import { defineServerConfig } from "../config/vite.server.ts";
import { findLocalViteConfig } from "../config/package-meta.ts";
import type { CliOptions, StepResult } from "../types.ts";
import { resolveBin } from "../resolve-bin.ts";
import { runCommand } from "../run.ts";
import { isTsPlatformShim } from "./typecheck.ts";

function inlineConfigForMode(options: CliOptions) {
  switch (options.mode) {
    case "lib":
      return defineLibConfig({ cwd: options.cwd });
    case "app":
      return defineAppConfig({ cwd: options.cwd });
    case "server":
      return defineServerConfig({ cwd: options.cwd });
  }
}

/** True only when tsconfig.build.json exists and enables declaration emit. */
function wantsDts(cwd: string): boolean {
  const buildTsconfig = join(cwd, "tsconfig.build.json");
  if (!existsSync(buildTsconfig)) return false;

  try {
    const raw = readFileSync(buildTsconfig, "utf8");
    // Tolerate // and /* */ comments common in tsconfig JSON.
    const stripped = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    const json = JSON.parse(stripped) as {
      compilerOptions?: { declaration?: boolean };
    };
    return json.compilerOptions?.declaration === true;
  } catch {
    return false;
  }
}

/**
 * Rewrite `from "./foo.ts"` / `from './bar.tsx'` in emitted .d.ts to `.js`
 * so Node/TS consumers resolve types against declaration files, not sources.
 */
function rewriteDtsImportExtensions(distDir: string): void {
  if (!existsSync(distDir)) return;

  const walk = (dir: string) => {
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
  };

  walk(distDir);
}

/**
 * Optional declaration emit after JS bundle.
 * Fail the build when declarations are requested but cannot be produced.
 */
async function runDts(cwd: string): Promise<StepResult | null> {
  if (!wantsDts(cwd)) return null;

  const dtsArgs = ["--emitDeclarationOnly", "-p", "tsconfig.build.json"];
  const tsgo = resolveBin("tsgo");

  if (tsgo) {
    const result = await runCommand({
      command: tsgo,
      args: dtsArgs,
      cwd,
    });
    if (result.code === 0) {
      rewriteDtsImportExtensions(join(cwd, "dist"));
      return null;
    }
    console.error(
      `[fixer-bundle] DTS emit failed (tsgo exit ${result.code}). ` +
        "Publishable packages require declarations when tsconfig.build.json sets declaration: true.",
    );
    return { name: "build", code: result.code || 1 };
  }

  const tsc = resolveBin("tsc");
  if (!tsc) {
    console.error(
      "[fixer-bundle] DTS requested (declaration: true) but neither tsgo nor tsc found.",
    );
    return { name: "build", code: 1 };
  }

  // TypeScript 7 platform shim needs @typescript/typescript-<platform>; prefer tsgo.
  if (isTsPlatformShim(tsc)) {
    console.error(
      "[fixer-bundle] DTS: tsgo not found; TypeScript 7 tsc shim is unreliable without " +
        "@typescript/typescript-<platform>. Install @typescript/native-preview (tsgo).",
    );
    return { name: "build", code: 1 };
  }

  const isJs = tsc.endsWith(".js");
  const result = await runCommand({
    command: isJs ? process.execPath : tsc,
    args: isJs ? [tsc, ...dtsArgs] : dtsArgs,
    cwd,
  });
  if (result.code === 0) {
    rewriteDtsImportExtensions(join(cwd, "dist"));
    return null;
  }

  console.error(
    `[fixer-bundle] DTS emit failed (tsc exit ${result.code}). ` +
      "Prefer @typescript/native-preview (tsgo) if you see platform package errors.",
  );
  return { name: "build", code: result.code || 1 };
}

export async function runBuild(options: CliOptions): Promise<StepResult> {
  try {
    const explicit = options.config;
    const local = explicit ?? findLocalViteConfig(options.cwd);

    if (local) {
      // Use vite CLI so config resolution plugins work fully
      const viteBin = resolveBin("vite");
      if (!viteBin) {
        console.error("[fixer-bundle] vite not found");
        return { name: "build", code: 1 };
      }
      const args = ["build", "--config", local];
      if (options.watch) args.push("--watch");
      const result = await runCommand({
        command: viteBin,
        args,
        cwd: options.cwd,
      });
      if (result.code !== 0) return { name: "build", code: result.code };
    } else {
      // Zero-config programmatic build does not support --watch yet.
      const config = inlineConfigForMode(options);
      await viteBuild({
        ...config,
        configFile: false,
        root: options.cwd,
      });
    }

    const dtsFail = await runDts(options.cwd);
    if (dtsFail) return dtsFail;

    return { name: "build", code: 0 };
  } catch (err) {
    console.error("[fixer-bundle] build failed:", err);
    return { name: "build", code: 1 };
  }
}
