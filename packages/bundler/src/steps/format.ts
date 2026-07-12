import type { CliOptions, StepResult } from "../types.ts";
import { resolveBin } from "../resolve-bin.ts";
import { runCommand } from "../run.ts";

export async function runFormat(options: CliOptions): Promise<StepResult> {
  const bin = resolveBin("oxfmt");
  if (!bin) {
    console.error("[fixer-bundle] oxfmt not found");
    return { name: "format", code: 1 };
  }
  const result = await runCommand({
    command: bin,
    args: options.formatCheck ? ["--check", "."] : ["--write", "."],
    cwd: options.cwd,
  });
  return { name: "format", code: result.code };
}
