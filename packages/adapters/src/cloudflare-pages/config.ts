import type { CloudflarePagesOptions, RoutesJson } from "@fixerframework/types/adapters";

export type { RoutesJson };

/**
 * Default `_routes.json` exclude patterns.
 * Cloudflare serves these paths as static assets without invoking the Function.
 */
export const DEFAULT_EXCLUDE = [
  "/assets/*",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
  "/site.webmanifest",
] as const;

/**
 * Generate the `_redirects` file content.
 *
 * Format (Cloudflare Pages):
 * ```
 * /old /new 301
 * /* /index.html 200
 * ```
 *
 * In static mode with `spaFallback` (default), appends `/* /index.html 200`
 * so client-side routing works. Custom rules come first (higher priority).
 */
export function generateRedirects(options: CloudflarePagesOptions): string {
  const lines: string[] = [];

  for (const rule of options.redirects ?? []) {
    lines.push(`${rule.from} ${rule.to} ${String(rule.status)}`);
  }

  const isStatic = (options.mode ?? "static") === "static";
  if (isStatic && (options.spaFallback ?? true)) {
    lines.push("/* /index.html 200");
  }

  return lines.length > 0 ? `${lines.join("\n")}\n` : "";
}

/**
 * Default headers applied to every deployment.
 * Merged with user-provided headers (user wins on conflicts).
 */
function defaultHeaders(assetCacheControl: string): Record<string, Record<string, string>> {
  return {
    "/assets/*": {
      "Cache-Control": assetCacheControl,
    },
    "/*": {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
  };
}

/**
 * Generate the `_headers` file content.
 *
 * Format (Cloudflare Pages):
 * ```
 * /assets/*
 *   Cache-Control: public, max-age=31536000, immutable
 * /*
 *   X-Content-Type-Options: nosniff
 * ```
 *
 * Defaults are merged with user headers; user values override defaults
 * on a per-header-key basis.
 */
export function generateHeaders(options: CloudflarePagesOptions): string {
  const cacheControl = options.assetCacheControl ?? "public, max-age=31536000, immutable";
  const defaults = defaultHeaders(cacheControl);
  const user = options.headers ?? {};

  // Merge: defaults first, user patterns appended, user overrides on shared patterns.
  const patterns = new Map<string, Map<string, string>>();
  for (const [pattern, hdrs] of Object.entries(defaults)) {
    const map = new Map<string, string>();
    for (const [k, v] of Object.entries(hdrs)) {
      map.set(k, v);
    }
    patterns.set(pattern, map);
  }
  for (const [pattern, hdrs] of Object.entries(user)) {
    let map = patterns.get(pattern);
    if (!map) {
      map = new Map<string, string>();
      patterns.set(pattern, map);
    }
    for (const [k, v] of Object.entries(hdrs)) {
      map.set(k, v);
    }
  }

  const lines: string[] = [];
  for (const [pattern, hdrs] of patterns) {
    lines.push(pattern);
    for (const [key, value] of hdrs) {
      lines.push(`  ${key}: ${value}`);
    }
  }
  return lines.length > 0 ? `${lines.join("\n")}\n` : "";
}


/**
 * Generate the `_routes.json` content for server mode.
 *
 * Controls which paths invoke the Pages Function vs serve static assets.
 * Only meaningful in "server" mode.
 */
export function generateRoutes(options: CloudflarePagesOptions): RoutesJson {
  return {
    version: 1,
    include: options.include ?? ["/*"],
    exclude: options.exclude ?? [...DEFAULT_EXCLUDE],
  };
}
