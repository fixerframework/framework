import type {
  CloudflareWorkersOptions,
  GenerateWranglerOptions,
  WranglerConfig,
} from "@fixerframework/types/adapters";
import {
  generateHeaders as generatePagesHeaders,
  generateRedirects as generatePagesRedirects,
} from "../cloudflare-pages/config.ts";

export type { GenerateWranglerOptions, WranglerConfig };

/** Default Wrangler compatibility_date (deterministic builds / tests). */
export const DEFAULT_COMPATIBILITY_DATE = "2026-07-01";


/**
 * Generate `_headers` file content (same format as Pages / Workers Static Assets).
 */
export function generateHeaders(options: CloudflareWorkersOptions): string {
  return generatePagesHeaders({
    headers: options.headers,
    assetCacheControl: options.assetCacheControl,
  });
}

/**
 * Generate `_redirects` for custom rules only.
 * SPA fallback is handled by Wrangler `not_found_handling`, not `_redirects`.
 */
export function generateRedirects(options: CloudflareWorkersOptions): string {
  return generatePagesRedirects({
    mode: "server", // never append Pages-style SPA `/* /index.html 200`
    redirects: options.redirects,
    spaFallback: false,
  });
}

function resolveSpaFallback(options: CloudflareWorkersOptions): boolean {
  if (options.spaFallback !== undefined) {
    return options.spaFallback;
  }
  return (options.mode ?? "static") === "static";
}

function resolveRunWorkerFirst(
  options: CloudflareWorkersOptions,
): boolean | string[] | undefined {
  if (options.runWorkerFirst !== undefined) {
    return options.runWorkerFirst;
  }
  if ((options.mode ?? "static") === "server") {
    return true;
  }
  return undefined;
}

/**
 * Build a Wrangler JSON config object for Workers + Static Assets.
 *
 * - **static**: assets only; SPA via `not_found_handling` when spaFallback.
 * - **server**: `main` + `assets.binding` + `run_worker_first` by default.
 */
export function generateWranglerConfig(options: GenerateWranglerOptions): WranglerConfig {
  const mode = options.mode ?? "static";
  const directory = options.assetsDirectory ?? "./dist";
  const normalizedDir = directory.startsWith(".") ? directory : `./${directory}`;

  const assets: WranglerConfig["assets"] = {
    directory: normalizedDir.endsWith("/") ? normalizedDir.slice(0, -1) : normalizedDir,
  };

  if (resolveSpaFallback(options)) {
    assets.not_found_handling = "single-page-application";
  }

  const config: WranglerConfig = {
    name: options.name,
    compatibility_date: options.compatibilityDate ?? DEFAULT_COMPATIBILITY_DATE,
    assets,
  };

  if (options.compatibilityFlags && options.compatibilityFlags.length > 0) {
    config.compatibility_flags = [...options.compatibilityFlags];
  }

  if (mode === "server") {
    if (options.main) {
      config.main = options.main;
    }
    assets.binding = options.assetsBinding ?? "ASSETS";
    const runFirst = resolveRunWorkerFirst(options);
    if (runFirst !== undefined) {
      assets.run_worker_first = runFirst;
    }
  }

  return config;
}

