import { describe, it, expect } from "vitest";
import {
  generateWranglerConfig,
  generateHeaders,
  generateRedirects,
  DEFAULT_COMPATIBILITY_DATE,
} from "../../src/cloudflare-workers/config.ts";

describe("generateWranglerConfig", () => {
  it("builds static SPA config by default", () => {
    const config = generateWranglerConfig({ name: "my-app" });
    expect(config.name).toBe("my-app");
    expect(config.compatibility_date).toBe(DEFAULT_COMPATIBILITY_DATE);
    expect(config.main).toBeUndefined();
    expect(config.assets).toEqual({
      directory: "./dist",
      not_found_handling: "single-page-application",
    });
    expect(config.assets.binding).toBeUndefined();
    expect(config.assets.run_worker_first).toBeUndefined();
  });

  it("omits SPA not_found_handling when spaFallback is false", () => {
    const config = generateWranglerConfig({
      name: "my-app",
      spaFallback: false,
    });
    expect(config.assets.not_found_handling).toBeUndefined();
  });

  it("uses custom assetsDirectory and compatibility options", () => {
    const config = generateWranglerConfig({
      name: "api",
      assetsDirectory: "build/client",
      compatibilityDate: "2026-04-01",
      compatibilityFlags: ["nodejs_compat"],
    });
    expect(config.assets.directory).toBe("./build/client");
    expect(config.compatibility_date).toBe("2026-04-01");
    expect(config.compatibility_flags).toEqual(["nodejs_compat"]);
  });

  it("builds server mode with main, binding, and run_worker_first", () => {
    const config = generateWranglerConfig({
      name: "my-app",
      mode: "server",
      main: "./src/worker.ts",
    });
    expect(config.main).toBe("./src/worker.ts");
    expect(config.assets.binding).toBe("ASSETS");
    expect(config.assets.run_worker_first).toBe(true);
    // SPA off by default in server mode
    expect(config.assets.not_found_handling).toBeUndefined();
  });

  it("allows spaFallback in server mode", () => {
    const config = generateWranglerConfig({
      name: "my-app",
      mode: "server",
      main: "./src/worker.ts",
      spaFallback: true,
    });
    expect(config.assets.not_found_handling).toBe("single-page-application");
  });

  it("accepts runWorkerFirst path patterns", () => {
    const config = generateWranglerConfig({
      name: "my-app",
      mode: "server",
      main: "./src/worker.ts",
      runWorkerFirst: ["/api/*", "!/api/docs/*"],
    });
    expect(config.assets.run_worker_first).toEqual(["/api/*", "!/api/docs/*"]);
  });

  it("uses custom assetsBinding", () => {
    const config = generateWranglerConfig({
      name: "my-app",
      mode: "server",
      main: "./worker.js",
      assetsBinding: "STATIC",
    });
    expect(config.assets.binding).toBe("STATIC");
  });

  it("serializes to valid JSON", () => {
    const config = generateWranglerConfig({ name: "x", mode: "server", main: "./w.ts" });
    expect(JSON.parse(JSON.stringify(config))).toEqual(config);
  });
});

describe("generateHeaders (workers)", () => {
  it("includes immutable cache and security defaults", () => {
    const result = generateHeaders({});
    expect(result).toContain("/assets/*");
    expect(result).toContain("Cache-Control: public, max-age=31536000, immutable");
    expect(result).toContain("X-Content-Type-Options: nosniff");
  });
});

describe("generateRedirects (workers)", () => {
  it("does not emit SPA fallback by default", () => {
    expect(generateRedirects({})).toBe("");
  });

  it("emits custom redirect rules only", () => {
    const result = generateRedirects({
      redirects: [{ from: "/old", to: "/new", status: 301 }],
    });
    expect(result).toContain("/old /new 301");
    expect(result).not.toContain("/index.html");
  });
});
