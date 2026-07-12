import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ResolvedConfig } from "vite";
import { cloudflareWorkers } from "../../src/cloudflare-workers/plugin.ts";
import type { Plugin } from "vite";

function makeResolvedConfig(root: string, outDir = "dist"): ResolvedConfig {
  return { root, build: { outDir } } as unknown as ResolvedConfig;
}

function runPlugin(plugin: Plugin, root: string, outDir = "dist"): void {
  const configResolved = plugin.configResolved as
    | ((config: ResolvedConfig) => void)
    | undefined;
  const closeBundle = plugin.closeBundle as (() => void) | undefined;
  configResolved?.(makeResolvedConfig(root, outDir));
  closeBundle?.();
}

describe("cloudflareWorkers plugin", () => {
  let tmpRoot: string;

  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), "ff-cfworkers-"));
  });

  afterEach(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("has the correct plugin name and applies to build", () => {
    const plugin = cloudflareWorkers();
    expect(plugin.name).toBe("fixerframework:cloudflare-workers");
    expect(plugin.apply).toBe("build");
  });

  it("writes _headers in static mode", () => {
    const plugin = cloudflareWorkers();
    runPlugin(plugin, tmpRoot);

    const headers = readFileSync(join(tmpRoot, "dist", "_headers"), "utf8");
    expect(headers).toContain("X-Content-Type-Options: nosniff");
    expect(headers).toContain("/assets/*");
  });

  it("does not write _redirects without custom rules", () => {
    const plugin = cloudflareWorkers();
    runPlugin(plugin, tmpRoot);

    expect(existsSync(join(tmpRoot, "dist", "_redirects"))).toBe(false);
  });

  it("writes custom _redirects without SPA fallback", () => {
    const plugin = cloudflareWorkers({
      redirects: [{ from: "/old", to: "/new", status: 301 }],
    });
    runPlugin(plugin, tmpRoot);

    const redirects = readFileSync(join(tmpRoot, "dist", "_redirects"), "utf8");
    expect(redirects).toContain("/old /new 301");
    expect(redirects).not.toContain("/index.html");
  });

  it("does not write wrangler.json when name is omitted", () => {
    const plugin = cloudflareWorkers();
    runPlugin(plugin, tmpRoot);

    expect(existsSync(join(tmpRoot, "wrangler.json"))).toBe(false);
  });

  it("writes wrangler.json when name is set", () => {
    const plugin = cloudflareWorkers({ name: "my-app" });
    runPlugin(plugin, tmpRoot);

    const wrangler = JSON.parse(readFileSync(join(tmpRoot, "wrangler.json"), "utf8"));
    expect(wrangler.name).toBe("my-app");
    expect(wrangler.assets.directory).toBe("./dist");
    expect(wrangler.assets.not_found_handling).toBe("single-page-application");
    expect(wrangler.main).toBeUndefined();
  });

  it("writes server-mode wrangler with main and binding", () => {
    const plugin = cloudflareWorkers({
      name: "my-app",
      mode: "server",
      main: "./src/worker.ts",
    });
    runPlugin(plugin, tmpRoot);

    const wrangler = JSON.parse(readFileSync(join(tmpRoot, "wrangler.json"), "utf8"));
    expect(wrangler.main).toBe("./src/worker.ts");
    expect(wrangler.assets.binding).toBe("ASSETS");
    expect(wrangler.assets.run_worker_first).toBe(true);
  });

  it("respects writeWrangler: false", () => {
    const plugin = cloudflareWorkers({ name: "my-app", writeWrangler: false });
    runPlugin(plugin, tmpRoot);

    expect(existsSync(join(tmpRoot, "wrangler.json"))).toBe(false);
    expect(existsSync(join(tmpRoot, "dist", "_headers"))).toBe(true);
  });

  it("respects custom wranglerPath and outDir", () => {
    const plugin = cloudflareWorkers({
      name: "custom",
      wranglerPath: "deploy/wrangler.json",
    });
    runPlugin(plugin, tmpRoot, "public");

    expect(existsSync(join(tmpRoot, "public", "_headers"))).toBe(true);
    const wrangler = JSON.parse(
      readFileSync(join(tmpRoot, "deploy", "wrangler.json"), "utf8"),
    );
    expect(wrangler.assets.directory).toBe("./public");
  });
});
