import type { CliOptions, StepResult } from "../types.ts";
import { resolveBin } from "../resolve-bin.ts";
import { runCommand } from "../run.ts";

export async function runLint(options: CliOptions): Promise<StepResult> {
  const bin = resolveBin("oxlint");
  if (!bin) {
    console.error("[fixer-bundle] oxlint not found");
    return { name: "lint", code: 1 };
  }
  const result = await runCommand({
    command: bin,
    args: ["."],
    cwd: options.cwd,
  });
  return { name: "lint", code: result.code };
}
