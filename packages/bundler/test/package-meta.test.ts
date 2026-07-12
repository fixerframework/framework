import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  detectLibEntry,
  detectServerEntry,
  readPackageExternals,
} from "../src/config/package-meta.ts";

describe("package-meta", () => {
  it("detects index.ts over missing src/index.ts", () => {
    const dir = mkdtempSync(join(tmpdir(), "ff-bundle-"));
    writeFileSync(join(dir, "index.ts"), "export {}");
    expect(detectLibEntry(dir)).toBe(join(dir, "index.ts"));
  });

  it("detects src/index.ts when root index missing", () => {
    const dir = mkdtempSync(join(tmpdir(), "ff-bundle-"));
    mkdirSync(join(dir, "src"));
    writeFileSync(join(dir, "src", "index.ts"), "export {}");
    expect(detectLibEntry(dir)).toBe(join(dir, "src", "index.ts"));
  });

  it("reads dependency and peer names as externals", () => {
    const dir = mkdtempSync(join(tmpdir(), "ff-bundle-"));
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({
        dependencies: { preact: "10.0.0" },
        peerDependencies: { typescript: "5" },
        devDependencies: { vitest: "1" },
      }),
    );
    const ext = readPackageExternals(dir);
    expect(ext.has("preact")).toBe(true);
    expect(ext.has("typescript")).toBe(true);
    expect(ext.has("vitest")).toBe(false);
  });

  it("detects server entry", () => {
    const dir = mkdtempSync(join(tmpdir(), "ff-bundle-"));
    mkdirSync(join(dir, "src"));
    writeFileSync(join(dir, "src", "server.ts"), "export {}");
    expect(detectServerEntry(dir)).toBe(join(dir, "src", "server.ts"));
  });
});
