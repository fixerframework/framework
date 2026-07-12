import type { RedirectRule } from "../types.ts";

/**
 * Cloudflare Workers deployment options.
 *
 * The adapter supports two modes:
 * - **static** (default): Pure static SPA assets via Workers Static Assets.
 *   SPA fallback is configured with `assets.not_found_handling =
 *   "single-page-application"` in generated Wrangler config.
 * - **server**: Worker script + static assets. Generates Wrangler with
 *   `main`, `assets.binding`, and `run_worker_first` so the Worker sees
 *   non-static traffic; static paths can still be delegated to `ASSETS`.
 */
export interface CloudflareWorkersOptions {
  /** Deployment mode. Default: "static". */
  mode?: "static" | "server";

  /**
   * Worker name. When set (and `writeWrangler` is not false), the plugin
   * writes `wrangler.json` (or `wranglerPath`) at the project root.
   */
  name?: string;

  /**
   * Worker entry module path for Wrangler `main`.
   * Used in "server" mode when writing wrangler config.
   * Example: `"./src/worker.ts"`.
   */
  main?: string;

  /**
   * Enable SPA not-found handling in Wrangler:
   * `assets.not_found_handling = "single-page-application"`.
   * Default: true in static mode, false in server mode.
   */
  spaFallback?: boolean;

  /**
   * Wrangler `compatibility_date`. Fixed default for deterministic builds.
   * Default: `"2026-07-01"`.
   */
  compatibilityDate?: string;

  /** Optional Wrangler `compatibility_flags`. */
  compatibilityFlags?: string[];

  /**
   * Override `assets.directory` in generated Wrangler config.
   * Default: Vite `build.outDir` resolved relative to project root (e.g. `"./dist"`).
   */
  assetsDirectory?: string;

  /**
   * Assets binding name for server mode. Default: `"ASSETS"`.
   * Only written when mode is "server" (and a Worker `main` is present).
   */
  assetsBinding?: string;

  /**
   * Wrangler `assets.run_worker_first`.
   * Default: `true` in server mode; omitted in static mode.
   * Pass a string array for path patterns (e.g. `["/api/*"]`).
   */
  runWorkerFirst?: boolean | string[];

  /** Custom `_redirects` rules written into the assets output directory. */
  redirects?: RedirectRule[];

  /**
   * Custom `_headers` entries: path pattern → header key/value pairs.
   * Merged with sensible defaults (immutable cache for hashed assets).
   */
  headers?: Record<string, Record<string, string>>;

  /**
   * Cache-Control for hashed assets under `/assets/*`.
   * Default: "public, max-age=31536000, immutable".
   */
  assetCacheControl?: string;

  /**
   * Path for generated Wrangler config, relative to project root.
   * Default: `"wrangler.json"`.
   */
  wranglerPath?: string;

  /**
   * Whether to write Wrangler config when `name` is set.
   * Default: true if `name` is provided.
   */
  writeWrangler?: boolean;
}
