import { spawn } from "node:child_process";
import { basename, isAbsolute } from "node:path";
import { isAllowedExecutableBasename } from "./resolve-bin.ts";
import type { RunCommandOptions, RunCommandResult } from "./types.ts";

function hasNul(value: string): boolean {
  return value.includes("\0");
}

/**
 * Validate spawn inputs before launching a child process.
 * Always use shell:false + absolute trusted command + argv array (never a shell string).
 */
export function validateRunCommandOptions(options: RunCommandOptions): string | null {
  const { command, args, cwd } = options;

  if (!command || hasNul(command)) {
    return "invalid command: empty or contains NUL";
  }
  if (!cwd || hasNul(cwd)) {
    return "invalid cwd: empty or contains NUL";
  }
  if (!Array.isArray(args)) {
    return "invalid args: expected string array";
  }
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (typeof arg !== "string" || hasNul(arg)) {
      return `invalid arg at index ${i}: must be a string without NUL`;
    }
  }

  // process.execPath is trusted (node/bun runtime); otherwise require absolute + allowlisted basename
  if (command === process.execPath) {
    return null;
  }
  if (!isAbsolute(command)) {
    return "invalid command: must be an absolute path (or process.execPath)";
  }
  if (!isAllowedExecutableBasename(basename(command))) {
    return `invalid command: basename not in allowlist (${basename(command)})`;
  }
  return null;
}

export async function runCommand(options: RunCommandOptions): Promise<RunCommandResult> {
  const validationError = validateRunCommandOptions(options);
  if (validationError) {
    console.error(`[fixer-bundle] refusing to spawn: ${validationError}`);
    return { code: 1 };
  }

  const { command, args, cwd, env } = options;

  return new Promise((resolve) => {
    // shell: false — never interpret shell metacharacters; args passed as argv array
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: "inherit",
      shell: false,
    });

    child.on("error", (err: NodeJS.ErrnoException) => {
      console.error(`[fixer-bundle] failed to spawn ${command}: ${err.message}`);
      resolve({ code: 1 });
    });

    child.on("close", (code) => {
      resolve({ code: code ?? 1 });
    });
  });
}
