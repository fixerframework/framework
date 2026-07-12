import type { Query, QueryDef } from "../core/types.ts";
import type { QueryCache } from "./cache.ts";
import { canFetch, ensureFetch, type LifecycleContext } from "./lifecycle.ts";

export interface QueryFactoryOptions {
  cache: QueryCache;
  lifecycle: LifecycleContext;
  defaultStaleAfter: number;
}

export function createQuery<T>(def: QueryDef<T>, opts: QueryFactoryOptions): Query<T> {
  const entry = opts.cache.getOrCreate<T>({
    key: def.key,
    fetchFn: def.fetch,
    enabled: def.enabled,
    scope: def.scope,
    staleAfter: def.staleAfter ?? opts.defaultStaleAfter,
  });

  // Kick off fetch when allowed
  void ensureFetch(entry, opts.lifecycle);

  // If not ready yet (e.g. auth), retry when conditions may change via external invalidation.
  // For auth, createState wires onChange. Also re-check on next microtask if already ready.
  if (!canFetch(entry, opts.lifecycle.auth) && entry.scope === "user") {
    // no-op here; scope wiring handles auth readiness
  }

  return {
    data: entry.data,
    status: entry.status,
    error: entry.error,
    isFetching: entry.isFetching,
    isStale: entry.isStale,
    refetch: () => ensureFetch(entry, opts.lifecycle, { force: true }),
  };
}

/** Attempt fetch for all user-scoped entries that are now allowed. */
export function refetchEligible(cache: QueryCache, lifecycle: LifecycleContext): void {
  for (const entry of cache.entries()) {
    if (canFetch(entry, lifecycle.auth) && (entry.isStale.value || entry.status.value === "idle")) {
      void ensureFetch(entry, lifecycle);
    }
  }
}
