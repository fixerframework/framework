import type { CliOptions, StepResult } from "../types.ts";
import { resolveBin } from "../resolve-bin.ts";
import { runCommand } from "../run.ts";

export async function runTest(options: CliOptions): Promise<StepResult> {
  const bin = resolveBin("vitest");
  if (!bin) {
    console.error("[fixer-bundle] vitest not found");
    return { name: "test", code: 1 };
  }
  const args = options.watch ? ["watch"] : ["run"];
  const result = await runCommand({
    command: bin,
    args,
    cwd: options.cwd,
  });
  return { name: "test", code: result.code };
}
