import type { RedirectRule } from "../types.ts";

/**
 * Minimal structural types for Cloudflare Pages Functions.
 * Defined here to avoid a hard dependency on `@cloudflare/workers-types`.
 */

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

/** Regex matching common static asset file extensions. */
const STATIC_ASSET_RE =
  /\.(?:html|js|css|png|jpg|jpeg|gif|webp|avif|svg|ico|woff|woff2|ttf|eot|otf|wasm|map|txt|xml|webmanifest|pdf)$/;

/** Paths always served as static in SSR mode. */
const STATIC_PATH_RE = /^\/(?:assets|static|public)\//;

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
      STATIC_ASSET_RE.test(url.pathname) ||
      STATIC_PATH_RE.test(url.pathname) ||
      exclude.some((re) => re.test(url.pathname))
    ) {
      return context.env.ASSETS.fetch(context.request);
    }
    return handler(context.request);
  };
}

