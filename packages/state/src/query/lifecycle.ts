import type { AuthRuntime } from "../core/types.ts";
import type { QueryCache, QueryEntry } from "./cache.ts";
import { isEntryStale } from "./cache.ts";

export interface LifecycleContext {
  auth?: AuthRuntime;
  fetch: typeof globalThis.fetch;
  getToken: () => Promise<string | null>;
}

function isScopeReady(entry: QueryEntry, auth?: AuthRuntime): boolean {
  if (entry.scope !== "user") return true;
  if (!auth) return false;
  return auth.isLoaded.value === true && auth.userId.value !== null;
}

export function canFetch(entry: QueryEntry, auth?: AuthRuntime): boolean {
  if (!entry.enabled()) return false;
  return isScopeReady(entry, auth);
}

/**
 * Run (or join) a fetch for the entry. Dedupes concurrent calls via `entry.inflight`.
 */
export async function ensureFetch(
  entry: QueryEntry,
  ctx: LifecycleContext,
  opts?: { force?: boolean },
): Promise<void> {
  if (!canFetch(entry, ctx.auth)) return;

  if (!opts?.force && !isEntryStale(entry) && entry.status.value === "success") {
    return;
  }

  if (entry.inflight) return entry.inflight;

  const run = (async () => {
    entry.isFetching.value = true;
    if (entry.status.value === "idle" || entry.status.value === "error") {
      entry.status.value = "pending";
    }
    entry.error.value = undefined;

    try {
      const token = await ctx.getToken();
      const data = await entry.fetchFn({ token, fetch: ctx.fetch });
      entry.data.value = data;
      entry.status.value = "success";
      entry.fetchedAt = Date.now();
      entry.isStale.value = false;
    } catch (err) {
      entry.error.value = err;
      entry.status.value = "error";
      // keep previous data on error during refetch
    } finally {
      entry.isFetching.value = false;
      entry.inflight = null;
    }
  })();

  entry.inflight = run;
  return run;
}

export function markStale(entry: QueryEntry): void {
  entry.isStale.value = true;
}

export function invalidateEntries(entries: QueryEntry[]): void {
  for (const entry of entries) {
    markStale(entry);
  }
}

/** Invalidate matching entries and optionally refetch those that can run. */
export async function invalidateAndMaybeRefetch(
  cache: QueryCache,
  prefix: readonly unknown[],
  ctx: LifecycleContext,
  refetch = true,
): Promise<void> {
  const matches = cache.entriesMatchingPrefix(prefix);
  invalidateEntries(matches);
  if (!refetch) return;
  await Promise.all(matches.map((e) => ensureFetch(e, ctx, { force: true })));
}
