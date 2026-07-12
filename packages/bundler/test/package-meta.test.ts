import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  detectLibEntry,
  detectServerEntry,
  isHostBuiltin,
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

  it("reads dependency, peer, and optional names as externals", () => {
    const dir = mkdtempSync(join(tmpdir(), "ff-bundle-"));
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({
        dependencies: { preact: "10.0.0" },
        peerDependencies: { typescript: "5" },
        optionalDependencies: { fsevents: "2" },
        devDependencies: { vitest: "1" },
      }),
    );
    const ext = readPackageExternals(dir);
    expect(ext.has("preact")).toBe(true);
    expect(ext.has("typescript")).toBe(true);
    expect(ext.has("fsevents")).toBe(true);
    expect(ext.has("vitest")).toBe(false);
  });

  it("detects server entry", () => {
    const dir = mkdtempSync(join(tmpdir(), "ff-bundle-"));
    mkdirSync(join(dir, "src"));
    writeFileSync(join(dir, "src", "server.ts"), "export {}");
    expect(detectServerEntry(dir)).toBe(join(dir, "src", "server.ts"));
  });

  it("recognizes Node and Bun host builtins", () => {
    expect(isHostBuiltin("net")).toBe(true);
    expect(isHostBuiltin("node:http2")).toBe(true);
    expect(isHostBuiltin("fs/promises")).toBe(true);
    expect(isHostBuiltin("worker_threads")).toBe(true);
    expect(isHostBuiltin("bun:ffi")).toBe(true);
    expect(isHostBuiltin("lodash")).toBe(false);
    expect(isHostBuiltin("./local")).toBe(false);
  });
});
