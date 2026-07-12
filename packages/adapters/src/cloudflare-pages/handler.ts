/**
 * Minimal structural types for Cloudflare Pages Functions.
 * Defined here to avoid a hard dependency on `@cloudflare/workers-types`.
 */

import { isStaticAssetPath } from "../cloudflare/static-assets.ts";

export interface AssetFetcher {
  fetch(request: Request): Promise<Response>;
}

export interface PagesEnv {
  ASSETS: AssetFetcher;
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
 * Wrap an app request handler into a Cloudflare Pages Function.
 *
 * Static asset requests (by extension or path prefix) are delegated to the
 * `ASSETS` binding. Everything else goes to `handler`.
 *
 * Usage in `functions/[[path]].ts`:
 * ```ts
 * import { createPagesHandler } from "@fixerframework/adapters/cloudflare-pages";
 * import { server } from "../src/server";
 *
 * export const onRequest = createPagesHandler(server.handle);
 * ```
 */
export function createPagesHandler<Env extends PagesEnv = PagesEnv>(
  handler: AppHandler,
  options?: { exclude?: RegExp[] },
): PagesFunction<Env> {
  const exclude = options?.exclude ?? [];
  return async (context) => {
    const url = new URL(context.request.url);
    if (
      isStaticAssetPath(url.pathname) ||
      exclude.some((re) => re.test(url.pathname))
    ) {
      return context.env.ASSETS.fetch(context.request);
    }
    return handler(context.request);
  };
}
