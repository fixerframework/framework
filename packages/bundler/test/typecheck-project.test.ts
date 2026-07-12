import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { typecheckProjectArgs } from "../src/steps/typecheck.ts";

describe("typecheckProjectArgs", () => {
  it("prefers tsconfig.json over tsconfig.build.json", () => {
    const dir = mkdtempSync(join(tmpdir(), "ff-tc-"));
    writeFileSync(join(dir, "tsconfig.json"), "{}");
    writeFileSync(join(dir, "tsconfig.build.json"), "{}");
    expect(typecheckProjectArgs(dir)).toEqual(["-p", "tsconfig.json"]);
  });

  it("falls back to tsconfig.build.json when base is missing", () => {
    const dir = mkdtempSync(join(tmpdir(), "ff-tc-"));
    writeFileSync(join(dir, "tsconfig.build.json"), "{}");
    expect(typecheckProjectArgs(dir)).toEqual(["-p", "tsconfig.build.json"]);
  });

  it("returns empty when no project config exists", () => {
    const dir = mkdtempSync(join(tmpdir(), "ff-tc-"));
    mkdirSync(dir, { recursive: true });
    expect(typecheckProjectArgs(dir)).toEqual([]);
  });
});
