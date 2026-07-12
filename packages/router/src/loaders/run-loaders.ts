import type { LoaderContext, NavigateOptions, RouteMatch } from "../core/types.ts";
import { isRedirect, type Redirect } from "../core/types.ts";
import { LoaderCache, loaderReuseKey } from "./loader-cache.ts";

export interface RunLoadersOptions {
  matches: RouteMatch[];
  prevMatches: RouteMatch[];
  pathname: string;
  search: string;
  signal: AbortSignal;
  navigate: (to: string, opts?: NavigateOptions) => void;
  cache: LoaderCache;
  force?: boolean;
}

export type RunLoadersOutcome =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; redirect: Redirect; data?: undefined }
  | { ok: false; error: unknown; data: Record<string, unknown>; redirect?: undefined };

function paramsEqual(a: Record<string, string>, b: Record<string, string>): boolean {
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}

/**
 * Whether cached *loader* data can be reused. `beforeLoad` is never skipped via this.
 */
function canReuseLoader(
  match: RouteMatch,
  prevMatches: RouteMatch[],
  cache: LoaderCache,
  search: string,
  force: boolean,
): boolean {
  if (force) return false;
  if (!match.route.loader) {
    // No loader body — nothing to re-fetch (beforeLoad still runs separately).
    return true;
  }
  const prev = prevMatches.find((m) => m.id === match.id);
  if (!prev || !paramsEqual(prev.params, match.params)) return false;
  const entry = cache.get(match.id);
  if (!entry || entry.error != null) return false;
  return entry.key === loaderReuseKey(match.id, match.params, search);
}

/**
 * Run loaders root → leaf.
 * - `beforeLoad` always runs when defined (guards every navigation).
 * - `loader` results are reused when route id + params + search are unchanged.
 */
export async function runLoaders(opts: RunLoadersOptions): Promise<RunLoadersOutcome> {
  const { matches, prevMatches, pathname, search, signal, navigate, cache, force = false } = opts;
  const data: Record<string, unknown> = {};
  const parentData: Record<string, unknown> = {};

  for (const match of matches) {
    if (signal.aborted) {
      return { ok: false, error: new DOMException("Aborted", "AbortError"), data };
    }

    const route = match.route;
    const reuseLoader = canReuseLoader(match, prevMatches, cache, search, force);

    const ctx: LoaderContext = {
      params: match.params,
      pathname,
      search,
      searchParams: new URLSearchParams(search.startsWith("?") ? search.slice(1) : search),
      signal,
      navigate,
      parentData: { ...parentData },
    };

    try {
      // Guards / auth checks — always on every navigation for this segment.
      if (route.beforeLoad) {
        await route.beforeLoad(ctx);
      }
      if (signal.aborted) {
        return { ok: false, error: new DOMException("Aborted", "AbortError"), data };
      }

      if (reuseLoader) {
        const entry = cache.get(match.id);
        const value = route.loader ? entry?.data : undefined;
        data[match.id] = value;
        parentData[match.id] = value;
        continue;
      }

      let result: unknown = undefined;
      if (route.loader) {
        result = await route.loader(ctx);
      }

      if (isRedirect(result)) {
        return { ok: false, redirect: result };
      }

      data[match.id] = result;
      parentData[match.id] = result;
      cache.set(match.id, {
        data: result,
        error: null,
        key: loaderReuseKey(match.id, match.params, search),
      });
    } catch (err) {
      if (isRedirect(err)) {
        return { ok: false, redirect: err };
      }
      if (signal.aborted || (err instanceof DOMException && err.name === "AbortError")) {
        return { ok: false, error: err, data };
      }
      cache.set(match.id, {
        data: undefined,
        error: err,
        key: loaderReuseKey(match.id, match.params, search),
      });
      return { ok: false, error: err, data };
    }
  }

  cache.retain(matches.map((m) => m.id));
  return { ok: true, data };
}
