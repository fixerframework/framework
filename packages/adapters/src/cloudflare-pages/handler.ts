/**
 * Cloudflare Pages Functions runtime bridge.
 * Types come from `@fixerframework/types/adapters`.
 */

import type {
  AppHandler,
  PagesEnv,
  PagesFunction,
} from "@fixerframework/types/adapters";
import { isStaticAssetPath } from "../cloudflare/static-assets.ts";

export type {
  AppHandler,
  AssetFetcher,
  ExecutionContext,
  PagesEnv,
  PagesFunction,
  PagesFunctionContext,
} from "@fixerframework/types/adapters";

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
