import { resolve } from "node:path";
import { runPipeline } from "./pipeline.ts";
import { runBuild } from "./steps/build.ts";
import { runFormat } from "./steps/format.ts";
import { runLint } from "./steps/lint.ts";
import { runTest } from "./steps/test.ts";
import { runTypecheck } from "./steps/typecheck.ts";
import type { BuildMode, CliOptions } from "./types.ts";

export type ParseSuccess = { ok: true; options: CliOptions };
export type ParseFailure = { ok: false; exitCode: number; message: string };
export type ParseResult = ParseSuccess | ParseFailure;

const MODES = new Set<string>(["lib", "app", "server"]);

const USAGE = `Usage: fixer-bundle --mode <lib|app|server> [options]

Options:
  --cwd <path>       Package root (default: cwd)
  --config <path>    Vite config path
  --no-format        Skip oxfmt
  --no-lint          Skip oxlint
  --no-typecheck     Skip typecheck
  --no-test          Skip vitest
  --no-build         Quality gate only
  --format-check     oxfmt check (no write)
  --watch            Watch vitest and Vite (local/explicit config only).
                     Zero-config programmatic build does not watch yet.
                     Without --no-test, vitest watch runs first and blocks build.
  -h, --help         Show help
`;

type RawArgs = {
  mode?: string;
  cwd?: string;
  config?: string;
  format: boolean;
  lint: boolean;
  typecheck: boolean;
  test: boolean;
  build: boolean;
  formatCheck: boolean;
  watch: boolean;
};

function fail(message: string, exitCode = 2): ParseFailure {
  return { ok: false, exitCode, message };
}

/** Reject path arguments that cannot be used safely (NUL is never valid in paths). */
function invalidPath(label: string, value: string): ParseFailure | null {
  if (value.includes("\0")) {
    return fail(`Invalid ${label}: path must not contain NUL bytes`);
  }
  return null;
}

function collectRaw(argv: string[]): ParseResult | RawArgs {
  const raw: RawArgs = {
    format: true,
    lint: true,
    typecheck: true,
    test: true,
    build: true,
    formatCheck: false,
    watch: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === undefined) continue;

    switch (arg) {
      case "--mode": {
        const value = argv[++i];
        if (!value) {
          return fail("Invalid or missing --mode. Expected lib|app|server, got: (empty)");
        }
        raw.mode = value;
        break;
      }
      case "--cwd": {
        const value = argv[++i];
        if (!value) {
          return fail("--cwd requires a path");
        }
        raw.cwd = value;
        break;
      }
      case "--config": {
        const value = argv[++i];
        if (!value) {
          return fail("--config requires a path");
        }
        raw.config = value;
        break;
      }
      case "--no-format":
        raw.format = false;
        break;
      case "--no-lint":
        raw.lint = false;
        break;
      case "--no-typecheck":
        raw.typecheck = false;
        break;
      case "--no-test":
        raw.test = false;
        break;
      case "--no-build":
        raw.build = false;
        break;
      case "--format-check":
        raw.formatCheck = true;
        break;
      case "--watch":
        raw.watch = true;
        break;
      case "--help":
      case "-h":
        return fail(USAGE, 0);
      default:
        return fail(`Unknown argument: ${arg}`);
    }
  }

  return raw;
}

export function parseArgs(argv: string[]): ParseResult {
  const collected = collectRaw(argv);
  if ("ok" in collected) {
    return collected;
  }

  const raw = collected;

  if (!raw.mode) {
    return fail("Missing required --mode <lib|app|server>");
  }
  if (!MODES.has(raw.mode)) {
    return fail(`Invalid or missing --mode. Expected lib|app|server, got: ${raw.mode}`);
  }

  if (raw.cwd !== undefined) {
    const bad = invalidPath("--cwd", raw.cwd);
    if (bad) return bad;
  }
  if (raw.config !== undefined) {
    const bad = invalidPath("--config", raw.config);
    if (bad) return bad;
  }

  const cwd = raw.cwd !== undefined ? resolve(raw.cwd) : process.cwd();
  const options: CliOptions = {
    mode: raw.mode as BuildMode,
    cwd,
    format: raw.format,
    lint: raw.lint,
    typecheck: raw.typecheck,
    test: raw.test,
    build: raw.build,
    formatCheck: raw.formatCheck,
    watch: raw.watch,
  };

  if (raw.config !== undefined) {
    options.config = resolve(cwd, raw.config);
  }

  return { ok: true, options };
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  const parsed = parseArgs(argv);
  if (!parsed.ok) {
    if (parsed.message) {
      const stream = parsed.exitCode === 0 ? console.log : console.error;
      stream(parsed.message);
    }
    return parsed.exitCode;
  }

  const { options } = parsed;

  if (options.watch && options.build && options.test) {
    console.log(
      "[fixer-bundle] note: --watch with test+build runs vitest watch first (blocking); use --no-test to watch-build only",
    );
  }

  const result = await runPipeline(options, {
    format: () => runFormat(options),
    lint: () => runLint(options),
    typecheck: () => runTypecheck(options),
    test: () => runTest(options),
    build: () => runBuild(options),
  });

  return result.code === 0 ? 0 : result.code || 1;
}
