import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runBuild } from "../src/steps/build.ts";
import type { CliOptions } from "../src/types.ts";

function baseOpts(cwd: string): CliOptions {
  return {
    mode: "lib",
    cwd,
    format: false,
    lint: false,
    typecheck: false,
    test: false,
    build: true,
    formatCheck: false,
    watch: false,
  };
}

describe("runBuild e2e (zero-config lib)", () => {
  it("builds dist/index.js and keeps node builtins external", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ff-build-e2e-"));
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({ name: "e2e-lib", type: "module", dependencies: {} }),
    );
    writeFileSync(
      join(dir, "index.ts"),
      `import { createServer } from "node:net";\nexport const ping = () => createServer;\n`,
    );

    const result = await runBuild(baseOpts(dir));
    expect(result.code).toBe(0);
    const out = join(dir, "dist", "index.js");
    expect(existsSync(out)).toBe(true);
    const js = readFileSync(out, "utf8");
    // Should remain an import of the host module, not a full inlined polyfill bundle of net.
    expect(js).toMatch(/node:net|from ["']net["']/);
  }, 60_000);

  it("emits declarations and rewrites .ts imports to .js when configured", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ff-build-dts-"));
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "e2e-dts", type: "module" }));
    writeFileSync(join(dir, "index.ts"), `export { helper } from "./helper.ts";\n`);
    writeFileSync(join(dir, "helper.ts"), `export const helper = 1;\n`);
    writeFileSync(
      join(dir, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          target: "ESNext",
          module: "ESNext",
          moduleResolution: "bundler",
          strict: true,
          skipLibCheck: true,
          noEmit: true,
          allowImportingTsExtensions: true,
        },
        include: ["*.ts"],
      }),
    );
    writeFileSync(
      join(dir, "tsconfig.build.json"),
      JSON.stringify({
        extends: "./tsconfig.json",
        compilerOptions: {
          noEmit: false,
          declaration: true,
          emitDeclarationOnly: true,
          declarationMap: true,
          outDir: "dist",
          rootDir: ".",
          allowImportingTsExtensions: true,
          rewriteRelativeImportExtensions: true,
        },
        include: ["index.ts", "helper.ts"],
      }),
    );

    const result = await runBuild(baseOpts(dir));
    expect(result.code).toBe(0);
    expect(existsSync(join(dir, "dist", "index.js"))).toBe(true);
    const dts = join(dir, "dist", "index.d.ts");
    expect(existsSync(dts)).toBe(true);
    expect(readFileSync(dts, "utf8")).toMatch(/from ["']\.\/helper\.js["']/);
  }, 60_000);
});
