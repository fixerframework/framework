import type { CliOptions, StepResult } from "./types.ts";

export type PipelineSteps = {
  format: () => Promise<StepResult>;
  lint: () => Promise<StepResult>;
  typecheck: () => Promise<StepResult>;
  test: () => Promise<StepResult>;
  build: () => Promise<StepResult>;
};

export type PipelineResult = {
  code: number;
  failedStep?: string;
};

const STEP_FLAGS: Array<{
  key: keyof PipelineSteps;
  enabled: (o: CliOptions) => boolean;
}> = [
  { key: "format", enabled: (o) => o.format },
  { key: "lint", enabled: (o) => o.lint },
  { key: "typecheck", enabled: (o) => o.typecheck },
  { key: "test", enabled: (o) => o.test },
  { key: "build", enabled: (o) => o.build },
];

export async function runPipeline(
  options: CliOptions,
  steps: PipelineSteps,
): Promise<PipelineResult> {
  for (const { key, enabled } of STEP_FLAGS) {
    if (!enabled(options)) continue;

    console.log(`[fixer-bundle] ${key}…`);
    const result = await steps[key]();
    if (result.code !== 0) {
      console.error(`[fixer-bundle] ${key} failed (exit ${result.code})`);
      return { code: result.code, failedStep: key };
    }
  }
  return { code: 0 };
}
