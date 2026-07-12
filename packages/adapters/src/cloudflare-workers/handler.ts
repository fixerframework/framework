/**
 * Cloudflare Workers runtime bridge.
 * Types come from `@fixerframework/types/adapters` (shared with Pages where applicable).
 */

import type {
  AppHandler,
  AssetFetcher,
  CreateWorkerHandlerOptions,
  WorkerFetchHandler,
  WorkersEnv,
} from "@fixerframework/types/adapters";
import { isStaticAssetPath } from "../cloudflare/static-assets.ts";

export type {
  AppHandler,
  AssetFetcher,
  CreateWorkerHandlerOptions,
  ExecutionContext,
  WorkerFetchHandler,
  WorkersEnv,
} from "@fixerframework/types/adapters";

function getAssetsFetcher(env: WorkersEnv, binding: string): AssetFetcher | undefined {
  const value = env[binding];
  if (
    value &&
    typeof value === "object" &&
    "fetch" in value &&
    typeof (value as AssetFetcher).fetch === "function"
  ) {
    return value as AssetFetcher;
  }
  return undefined;
}

/**
 * Wrap an app request handler into a Cloudflare Worker `fetch` handler.
 *
 * Static asset requests (by extension or path prefix) are delegated to the
 * assets binding when available. Everything else goes to `handler`.
 *
 * Usage:
 * ```ts
 * import { createWorkerHandler } from "@fixerframework/adapters";
 * import { server } from "./server";
 *
 * export default {
 *   fetch: createWorkerHandler(server.handle),
 * };
 * ```
 */
export function createWorkerHandler<Env extends WorkersEnv = WorkersEnv>(
  handler: AppHandler,
  options?: CreateWorkerHandlerOptions,
): WorkerFetchHandler<Env> {
  const exclude = options?.exclude ?? [];
  const bindingName = options?.assetsBinding ?? "ASSETS";

  return async (request, env, _ctx) => {
    const url = new URL(request.url);
    const isStatic =
      isStaticAssetPath(url.pathname) || exclude.some((re) => re.test(url.pathname));

    if (isStatic) {
      const assets = getAssetsFetcher(env, bindingName);
      if (assets) {
        return assets.fetch(request);
      }
    }

    return handler(request);
  };
}
