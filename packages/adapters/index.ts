/**
 * @fixerframework/adapters — Deploy adapters
 *
 * Host-specific build integrations: Cloudflare Pages and Cloudflare Workers.
 * Future adapters (Vercel, Netlify, Deno Deploy, …) follow the same pattern:
 * a Vite plugin + optional runtime handler bridge.
 *
 * ```ts
 * // Cloudflare Pages
 * import { cloudflarePages, createPagesHandler } from "@fixerframework/adapters";
 *
 * // Cloudflare Workers
 * import { cloudflareWorkers, createWorkerHandler } from "@fixerframework/adapters";
 * ```
 */

// Adapter contracts
export type { DeployAdapter, RedirectRule } from "./src/types.ts";

// Cloudflare Pages plugin
export { cloudflarePages } from "./src/cloudflare-pages/plugin.ts";
export type { CloudflarePagesOptions } from "./src/cloudflare-pages/options.ts";

// Pages config generators (useful for testing / custom build scripts)
export {
  generateRedirects,
  generateHeaders,
  generateRoutes,
  DEFAULT_EXCLUDE,
  type RoutesJson,
} from "./src/cloudflare-pages/config.ts";

// Pages runtime handler bridge
export {
  createPagesHandler,
  type AppHandler,
  type PagesFunction,
  type PagesFunctionContext,
  type PagesEnv,
  type ExecutionContext,
  type AssetFetcher,
} from "./src/cloudflare-pages/handler.ts";

// Cloudflare Workers plugin
export { cloudflareWorkers } from "./src/cloudflare-workers/plugin.ts";
export type { CloudflareWorkersOptions } from "./src/cloudflare-workers/options.ts";

// Workers config generators
export {
  generateWranglerConfig,
  generateHeaders as generateWorkersHeaders,
  generateRedirects as generateWorkersRedirects,
  DEFAULT_COMPATIBILITY_DATE,
  type WranglerConfig,
  type GenerateWranglerOptions,
} from "./src/cloudflare-workers/config.ts";

// Workers runtime handler bridge
export {
  createWorkerHandler,
  type WorkerFetchHandler,
  type WorkersEnv,
  type CreateWorkerHandlerOptions,
  type AppHandler as WorkerAppHandler,
  type ExecutionContext as WorkerExecutionContext,
  type AssetFetcher as WorkerAssetFetcher,
} from "./src/cloudflare-workers/handler.ts";
