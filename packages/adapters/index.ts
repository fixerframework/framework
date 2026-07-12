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
 * import type { CloudflarePagesOptions, AppHandler } from "@fixerframework/types/adapters";
 *
 * // Cloudflare Workers
 * import { cloudflareWorkers, createWorkerHandler } from "@fixerframework/adapters";
 * ```
 */

// Cloudflare Pages plugin
export { cloudflarePages } from "./src/cloudflare-pages/plugin.ts";

// Pages config generators (useful for testing / custom build scripts)
export {
  generateRedirects,
  generateHeaders,
  generateRoutes,
  DEFAULT_EXCLUDE,
} from "./src/cloudflare-pages/config.ts";

// Pages runtime handler bridge
export { createPagesHandler } from "./src/cloudflare-pages/handler.ts";

// Cloudflare Workers plugin
export { cloudflareWorkers } from "./src/cloudflare-workers/plugin.ts";

// Workers config generators
export {
  generateWranglerConfig,
  generateHeaders as generateWorkersHeaders,
  generateRedirects as generateWorkersRedirects,
  DEFAULT_COMPATIBILITY_DATE,
} from "./src/cloudflare-workers/config.ts";

// Workers runtime handler bridge
export { createWorkerHandler } from "./src/cloudflare-workers/handler.ts";
