import type { Plugin } from "vite";

/**
 * A deploy adapter integrates the bundler's build with a specific host.
 * Current adapters: Cloudflare Pages, Cloudflare Workers.
 */
export interface DeployAdapter {
  /** Adapter name (e.g., "cloudflare-pages"). */
  readonly name: string;
  /** Vite plugin applied during the bundler's build step. */
  plugin(options?: Record<string, unknown>): Plugin;
}

/** Custom redirect rule for `_redirects`. */
export interface RedirectRule {
  /** Source pattern (Cloudflare Pages syntax, e.g., "/old/*"). */
  from: string;
  /** Destination (e.g., "/new/:splat"). */
  to: string;
  /** HTTP status code. 200 = rewrite (serve destination without redirect). */
  status: number;
}

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
   */
  exclude?: string[];
  /** `_routes.json` include: paths routed to the Function. */
  include?: string[];
  /**
   * Cache-Control for hashed assets under `/assets/*`.
   * Default: "public, max-age=31536000, immutable".
   */
  assetCacheControl?: string;
}

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
   */
  main?: string;
  /**
   * Enable SPA not-found handling in Wrangler.
   * Default: true in static mode, false in server mode.
   */
  spaFallback?: boolean;
  /** Wrangler `compatibility_date`. Default: `"2026-07-01"`. */
  compatibilityDate?: string;
  /** Optional Wrangler `compatibility_flags`. */
  compatibilityFlags?: string[];
  /**
   * Override `assets.directory` in generated Wrangler config.
   * Default: Vite `build.outDir` resolved relative to project root.
   */
  assetsDirectory?: string;
  /**
   * Assets binding name for server mode. Default: `"ASSETS"`.
   */
  assetsBinding?: string;
  /**
   * Wrangler `assets.run_worker_first`.
   * Default: `true` in server mode; omitted in static mode.
   */
  runWorkerFirst?: boolean | string[];
  /** Custom `_redirects` rules written into the assets output directory. */
  redirects?: RedirectRule[];
  /**
   * Custom `_headers` entries: path pattern → header key/value pairs.
   */
  headers?: Record<string, Record<string, string>>;
  /**
   * Cache-Control for hashed assets under `/assets/*`.
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

/** Shape of the `_routes.json` file. */
export interface RoutesJson {
  version: 1;
  include: string[];
  exclude: string[];
}

/** Shape of a generated Wrangler JSON config (subset we emit). */
export interface WranglerConfig {
  name: string;
  compatibility_date: string;
  compatibility_flags?: string[];
  main?: string;
  assets: {
    directory: string;
    not_found_handling?: "single-page-application" | "404-page" | "none";
    binding?: string;
    run_worker_first?: boolean | string[];
  };
}

/**
 * Options for pure Wrangler config generation.
 * `assetsDirectory` defaults to `"./dist"` when not provided.
 */
export type GenerateWranglerOptions = CloudflareWorkersOptions & {
  /** Required for a valid Wrangler config. */
  name: string;
  /** Absolute or relative assets dir; default `"./dist"`. */
  assetsDirectory?: string;
};

/** Minimal structural asset binding (Cloudflare Pages / Workers). */
export interface AssetFetcher {
  fetch(request: Request): Promise<Response>;
}

export interface PagesEnv {
  ASSETS: AssetFetcher;
  [key: string]: unknown;
}

export interface WorkersEnv {
  ASSETS?: AssetFetcher;
  [key: string]: unknown;
}

export interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

export interface PagesFunctionContext<Env = PagesEnv> {
  request: Request;
  env: Env;
  ctx: ExecutionContext;
  data: Record<string, unknown>;
  next(input?: Request | string, init?: RequestInit): Promise<Response>;
}

export type PagesFunction<Env = PagesEnv> = (
  context: PagesFunctionContext<Env>,
) => Promise<Response> | Response;

/** App-level request handler (the FixerFramework server entry point). */
export type AppHandler = (request: Request) => Promise<Response> | Response;

/**
 * Worker `fetch` handler signature:
 * `export default { fetch: createWorkerHandler(...) }`.
 */
export type WorkerFetchHandler<Env = WorkersEnv> = (
  request: Request,
  env: Env,
  ctx: ExecutionContext,
) => Promise<Response> | Response;

export interface CreateWorkerHandlerOptions {
  /**
   * Extra path patterns treated as static (delegated to ASSETS when present).
   */
  exclude?: RegExp[];
  /**
   * Env key for the assets binding. Default: `"ASSETS"`.
   */
  assetsBinding?: string;
}

/** @deprecated Prefer {@link AppHandler}. */
export type WorkerAppHandler = AppHandler;
/** @deprecated Prefer {@link ExecutionContext}. */
export type WorkerExecutionContext = ExecutionContext;
/** @deprecated Prefer {@link AssetFetcher}. */
export type WorkerAssetFetcher = AssetFetcher;
