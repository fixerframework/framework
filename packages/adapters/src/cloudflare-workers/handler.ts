import { isStaticAssetPath } from "../cloudflare/static-assets.ts";

/**
 * Minimal structural types for Cloudflare Workers.
 * Defined here to avoid a hard dependency on `@cloudflare/workers-types`.
 */

export interface AssetFetcher {
  fetch(request: Request): Promise<Response>;
}

export interface WorkersEnv {
  ASSETS?: AssetFetcher;
  [key: string]: unknown;
}

export interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

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
