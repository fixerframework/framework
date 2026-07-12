import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ResolvedConfig } from "vite";
import { cloudflarePages } from "../../src/cloudflare-pages/plugin.ts";
import type { Plugin } from "vite";

function makeResolvedConfig(root: string, outDir = "dist"): ResolvedConfig {
  return { root, build: { outDir } } as unknown as ResolvedConfig;
}

/**
 * Vite's Plugin type declares hooks as ObjectHook (function | { handler }).
 * Our plugin always uses plain function hooks — narrow once per call site.
 */
function runPlugin(plugin: Plugin, root: string, outDir = "dist"): void {
  const configResolved = plugin.configResolved as
    | ((config: ResolvedConfig) => void)
    | undefined;
  const closeBundle = plugin.closeBundle as (() => void) | undefined;
  configResolved?.(makeResolvedConfig(root, outDir));
  closeBundle?.();
}

describe("cloudflarePages plugin", () => {
  let tmpRoot: string;

  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), "ff-cfpages-"));
  });

  afterEach(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("has the correct plugin name and applies to build", () => {
    const plugin = cloudflarePages();
    expect(plugin.name).toBe("fixerframework:cloudflare-pages");
    expect(plugin.apply).toBe("build");
  });

  it("writes _redirects and _headers in static mode", () => {
    const plugin = cloudflarePages();
    runPlugin(plugin, tmpRoot);

    const redirects = readFileSync(join(tmpRoot, "dist", "_redirects"), "utf8");
    expect(redirects).toContain("/* /index.html 200");

    const headers = readFileSync(join(tmpRoot, "dist", "_headers"), "utf8");
    expect(headers).toContain("X-Content-Type-Options: nosniff");
  });

  it("does not write _routes.json in static mode", () => {
    const plugin = cloudflarePages();
    runPlugin(plugin, tmpRoot);

    expect(existsSync(join(tmpRoot, "dist", "_routes.json"))).toBe(false);
  });

  it("writes _routes.json in server mode", () => {
    const plugin = cloudflarePages({ mode: "server" });
    runPlugin(plugin, tmpRoot);

    const routes = JSON.parse(readFileSync(join(tmpRoot, "dist", "_routes.json"), "utf8"));
    expect(routes.version).toBe(1);
    expect(routes.include).toEqual(["/*"]);
    expect(routes.exclude).toContain("/assets/*");
  });

  it("does not write _redirects in server mode without custom rules", () => {
    const plugin = cloudflarePages({ mode: "server" });
    runPlugin(plugin, tmpRoot);

    expect(existsSync(join(tmpRoot, "dist", "_redirects"))).toBe(false);
  });

  it("writes custom redirects but not SPA fallback in server mode", () => {
    const plugin = cloudflarePages({
      mode: "server",
      redirects: [{ from: "/old", to: "/new", status: 301 }],
    });
    runPlugin(plugin, tmpRoot);

    const redirects = readFileSync(join(tmpRoot, "dist", "_redirects"), "utf8");
    expect(redirects).toContain("/old /new 301");
    expect(redirects).not.toContain("/index.html");
  });

  it("respects custom outDir", () => {
    const plugin = cloudflarePages();
    runPlugin(plugin, tmpRoot, "public");

    expect(existsSync(join(tmpRoot, "public", "_redirects"))).toBe(true);
    expect(existsSync(join(tmpRoot, "public", "_headers"))).toBe(true);
  });

  it("writes custom redirect rules", () => {
    const plugin = cloudflarePages({
      redirects: [{ from: "/old", to: "/new", status: 301 }],
    });
    runPlugin(plugin, tmpRoot);

    const redirects = readFileSync(join(tmpRoot, "dist", "_redirects"), "utf8");
    expect(redirects).toContain("/old /new 301");
    expect(redirects).toContain("/* /index.html 200");
  });
});
