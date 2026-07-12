import { describe, it, expect } from "vitest";
import {
  generateRedirects,
  generateHeaders,
  generateRoutes,
  DEFAULT_EXCLUDE,
} from "../../src/cloudflare-pages/config.ts";
import type { CloudflarePagesOptions } from "../../src/cloudflare-pages/options.ts";

describe("generateRedirects", () => {
  it("appends SPA fallback by default in static mode", () => {
    const result = generateRedirects({});
    expect(result).toContain("/* /index.html 200");
    expect(result.endsWith("\n")).toBe(true);
  });

  it("omits SPA fallback when spaFallback is false", () => {
    const result = generateRedirects({ spaFallback: false });
    expect(result).toBe("");
  });

  it("omits SPA fallback in server mode", () => {
    const result = generateRedirects({ mode: "server" });
    expect(result).toBe("");
  });

  it("includes custom redirect rules before the SPA fallback", () => {
    const result = generateRedirects({
      redirects: [
        { from: "/old", to: "/new", status: 301 },
        { from: "/blog/*", to: "/posts/:splat", status: 301 },
      ],
    });
    const lines = result.trim().split("\n");
    expect(lines[0]).toBe("/old /new 301");
    expect(lines[1]).toBe("/blog/* /posts/:splat 301");
    expect(lines[2]).toBe("/* /index.html 200");
  });

  it("returns empty string when no rules and no fallback", () => {
    expect(generateRedirects({ spaFallback: false, mode: "server" })).toBe("");
  });
});

describe("generateHeaders", () => {
  it("includes immutable cache for /assets/* by default", () => {
    const result = generateHeaders({});
    expect(result).toContain("/assets/*");
    expect(result).toContain("Cache-Control: public, max-age=31536000, immutable");
  });

  it("includes security headers for /* by default", () => {
    const result = generateHeaders({});
    expect(result).toContain("X-Content-Type-Options: nosniff");
    expect(result).toContain("X-Frame-Options: DENY");
    expect(result).toContain("Referrer-Policy: strict-origin-when-cross-origin");
  });

  it("uses custom assetCacheControl", () => {
    const result = generateHeaders({ assetCacheControl: "no-cache" });
    expect(result).toContain("Cache-Control: no-cache");
    expect(result).not.toContain("immutable");
  });

  it("merges user headers into defaults (same pattern, override)", () => {
    const result = generateHeaders({
      headers: {
        "/*": {
          "X-Frame-Options": "SAMEORIGIN",
          "X-Custom": "yes",
        },
      },
    });
    // user overrides default on shared key
    expect(result).toContain("X-Frame-Options: SAMEORIGIN");
    expect(result).not.toContain("X-Frame-Options: DENY");
    // user adds new key to /* pattern
    expect(result).toContain("X-Custom: yes");
  });

  it("appends user-only patterns after defaults", () => {
    const result = generateHeaders({
      headers: {
        "/api/*": {
          "Access-Control-Allow-Origin": "*",
        },
      },
    });
    expect(result).toContain("/api/*");
    expect(result).toContain("Access-Control-Allow-Origin: *");
    // defaults still present
    expect(result).toContain("/assets/*");
    expect(result).toContain("/*");
  });
});

describe("generateRoutes", () => {
  it("returns version 1 with defaults", () => {
    const routes = generateRoutes({});
    expect(routes.version).toBe(1);
    expect(routes.include).toEqual(["/*"]);
    expect(routes.exclude).toEqual([...DEFAULT_EXCLUDE]);
  });

  it("uses custom include paths", () => {
    const routes = generateRoutes({ include: ["/api/*", "/app/*"] });
    expect(routes.include).toEqual(["/api/*", "/app/*"]);
  });

  it("uses custom exclude paths", () => {
    const routes = generateRoutes({ exclude: ["/static/*", "/images/*"] });
    expect(routes.exclude).toEqual(["/static/*", "/images/*"]);
  });

  it("serializes to valid JSON", () => {
    const routes = generateRoutes({});
    const json = JSON.parse(JSON.stringify(routes));
    expect(json).toEqual(routes);
  });
});
