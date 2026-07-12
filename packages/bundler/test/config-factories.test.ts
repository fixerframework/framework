import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { defineAppConfig } from "../src/config/vite.app.ts";
import { defineLibConfig } from "../src/config/vite.lib.ts";
import { defineServerConfig } from "../src/config/vite.server.ts";
import { defineVitestConfig } from "../src/config/vitest.ts";

function tempPkgWithEntry(entryRel = "index.ts"): string {
  const dir = mkdtempSync(join(tmpdir(), "ff-bundle-cfg-"));
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "tmp" }));
  const entryPath = join(dir, entryRel);
  mkdirSync(join(entryPath, ".."), { recursive: true });
  writeFileSync(entryPath, "export {}");
  return dir;
}

describe("config factories merge nested overrides", () => {
  it("defineLibConfig keeps lib defaults when build partial is passed", () => {
    const cwd = tempPkgWithEntry("index.ts");
    const cfg = defineLibConfig({ cwd, build: { sourcemap: true } });

    expect(cfg.build?.sourcemap).toBe(true);
    expect(cfg.build?.outDir).toBe("dist");
    expect(cfg.build?.lib).toMatchObject({
      formats: ["es"],
      fileName: "index",
    });
    expect(cfg.build?.lib && "entry" in cfg.build.lib).toBe(true);
    expect(cfg.build?.rollupOptions?.external).toBeTypeOf("function");
    const external = cfg.build?.rollupOptions?.external as (id: string) => boolean;
    expect(external("net")).toBe(true);
    expect(external("node:http2")).toBe(true);
    expect(external("worker_threads")).toBe(true);
  });

  it("defineLibConfig accepts multi-entry map with dynamic fileName", () => {
    const cwd = tempPkgWithEntry("index.ts");
    writeFileSync(join(cwd, "server.ts"), "export {}");
    const cfg = defineLibConfig({
      cwd,
      entry: { index: "./index.ts", server: "./server.ts" },
    });

    expect(cfg.build?.lib?.formats).toEqual(["es"]);
    expect(typeof cfg.build?.lib?.fileName).toBe("function");
    const fileName = cfg.build?.lib?.fileName;
    if (typeof fileName === "function") {
      expect(fileName("es", "server")).toBe("server.js");
    }
  });


  it("defineAppConfig keeps build defaults when build partial is passed", () => {
    const cwd = mkdtempSync(join(tmpdir(), "ff-bundle-app-"));
    writeFileSync(join(cwd, "index.html"), "<!doctype html><html></html>");
    const cfg = defineAppConfig({ cwd, build: { sourcemap: true } });

    expect(cfg.root).toBe(cwd);
    expect(cfg.build?.sourcemap).toBe(true);
    expect(cfg.build?.outDir).toBe("dist");
    expect(cfg.build?.emptyOutDir).toBe(true);
  });

  it("defineAppConfig throws when index.html is missing", () => {
    const cwd = mkdtempSync(join(tmpdir(), "ff-bundle-app-miss-"));
    expect(() => defineAppConfig({ cwd })).toThrow(/index\.html/);
  });

  it("defineServerConfig keeps lib/ssr defaults when build partial is passed", () => {
    const cwd = tempPkgWithEntry("src/server.ts");
    const cfg = defineServerConfig({ cwd, build: { sourcemap: true } });

    expect(cfg.root).toBe(cwd);
    expect(cfg.build?.sourcemap).toBe(true);
    expect(cfg.build?.outDir).toBe("dist");
    expect(cfg.build?.ssr).toBe(true);
    expect(cfg.build?.lib).toMatchObject({
      formats: ["es"],
      fileName: "server",
    });
    const external = cfg.build?.rollupOptions?.external as (id: string) => boolean;
    expect(external("net")).toBe(true);
  });

  it("defineVitestConfig keeps test defaults when test partial is passed", () => {
    const cfg = defineVitestConfig({ test: { coverage: { enabled: true } } });

    expect(cfg.test?.environment).toBe("node");
    expect(cfg.test?.include).toEqual(["test/**/*.test.ts", "test/**/*.test.tsx"]);
    expect(cfg.test?.coverage).toMatchObject({ enabled: true });
  });
});
