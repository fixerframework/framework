import type { RedirectRule } from "../types.ts";

/**
 * Cloudflare Pages deployment options.
 *
 * The adapter supports two modes:
 * - **static** (default): Pure static SPA assets. Generates `_redirects`
 *   for client-side routing fallback and `_headers` for caching/security.
 * - **server**: SSR/edge via Pages Functions. Generates `_routes.json`
 *   so Cloudflare routes static assets directly and sends the rest to
 *   your Function/Worker.
 */
export interface CloudflarePagesOptions {
  /** Deployment mode. Default: "static". */
  mode?: "static" | "server";

  /**
   * Generate SPA fallback redirect: `/* /index.html 200`.
   * Only applies in "static" mode. Default: true.
   */
  spaFallback?: boolean;

  /** Custom `_redirects` rules prepended before the SPA fallback. */
  redirects?: RedirectRule[];

  /**
   * Custom `_headers` entries: path pattern → header key/value pairs.
   * Merged with sensible defaults (immutable cache for hashed assets).
   */
  headers?: Record<string, Record<string, string>>;

  /**
   * `_routes.json` exclude: paths served as static (no Function).
   * Only used in "server" mode.
   * Default: common static asset patterns.
   */
  exclude?: string[];

  /**
   * `_routes.json` include: paths routed to the Function.
   */
  include?: string[];

  /**
   * Cache-Control for hashed assets under `/assets/*`.
   * Default: "public, max-age=31536000, immutable".
   */
  assetCacheControl?: string;
}

