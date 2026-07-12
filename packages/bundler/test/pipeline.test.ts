import { describe, expect, it } from "vitest";
import { runPipeline } from "../src/pipeline.ts";
import type { CliOptions, StepResult } from "../src/types.ts";

function baseOptions(overrides: Partial<CliOptions> = {}): CliOptions {
  return {
    mode: "lib",
    cwd: "/tmp/pkg",
    format: true,
    lint: true,
    typecheck: true,
    test: true,
    build: true,
    formatCheck: false,
    watch: false,
    ...overrides,
  };
}

describe("runPipeline", () => {
  it("runs steps in order: format, lint, typecheck, test, build", async () => {
    const order: string[] = [];
    const step = (name: string) => async (): Promise<StepResult> => {
      order.push(name);
      return { name, code: 0 };
    };

    const result = await runPipeline(baseOptions(), {
      format: step("format"),
      lint: step("lint"),
      typecheck: step("typecheck"),
      test: step("test"),
      build: step("build"),
    });

    expect(result.code).toBe(0);
    expect(order).toEqual(["format", "lint", "typecheck", "test", "build"]);
  });

  it("stops on first failure and does not run later steps", async () => {
    const order: string[] = [];
    const step = (name: string, code: number) => async (): Promise<StepResult> => {
      order.push(name);
      return { name, code };
    };

    const result = await runPipeline(baseOptions(), {
      format: step("format", 0),
      lint: step("lint", 3),
      typecheck: step("typecheck", 0),
      test: step("test", 0),
      build: step("build", 0),
    });

    expect(result.code).toBe(3);
    expect(result.failedStep).toBe("lint");
    expect(order).toEqual(["format", "lint"]);
  });

  it("skips steps when flags disable them", async () => {
    const order: string[] = [];
    const step = (name: string) => async (): Promise<StepResult> => {
      order.push(name);
      return { name, code: 0 };
    };

    const result = await runPipeline(
      baseOptions({
        format: false,
        lint: false,
        typecheck: false,
        test: true,
        build: false,
      }),
      {
        format: step("format"),
        lint: step("lint"),
        typecheck: step("typecheck"),
        test: step("test"),
        build: step("build"),
      },
    );

    expect(result.code).toBe(0);
    expect(order).toEqual(["test"]);
  });
});
