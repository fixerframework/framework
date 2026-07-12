/**
 * @fixerframework/adapters — Deploy adapters
 *
 * Host-specific build integrations. The first adapter is Cloudflare Pages.
 * Future adapters (Vercel, Netlify, Deno Deploy, …) will follow the same
 * pattern: a Vite plugin + optional runtime handler bridge.
 *
 * ```ts
 * // vite.config.ts
 * import { defineAppConfig } from "@fixerframework/bundler/vite/app";
 * import { cloudflarePages } from "@fixerframework/adapters";
 *
 * export default defineAppConfig({
 *   plugins: [cloudflarePages()],
 * });
 *
 * // functions/[[path]].ts (SSR mode)
 * import { createPagesHandler } from "@fixerframework/adapters";
 * import { server } from "../src/server";
 * export const onRequest = createPagesHandler(server.handle);
 * ```
 */

// Adapter contracts
export type { DeployAdapter, RedirectRule } from "./src/types.ts";

// Cloudflare Pages plugin
export { cloudflarePages } from "./src/cloudflare-pages/plugin.ts";
export type { CloudflarePagesOptions } from "./src/cloudflare-pages/options.ts";

// Config generators (useful for testing / custom build scripts)
export {
  generateRedirects,
  generateHeaders,
  generateRoutes,
  DEFAULT_EXCLUDE,
  type RoutesJson,
} from "./src/cloudflare-pages/config.ts";

// Runtime handler bridge
export {
  createPagesHandler,
  type AppHandler,
  type PagesFunction,
  type PagesFunctionContext,
  type PagesEnv,
  type ExecutionContext,
  type AssetFetcher,
} from "./src/cloudflare-pages/handler.ts";
