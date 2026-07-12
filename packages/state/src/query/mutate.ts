import type { MutateDef } from "../core/types.ts";
import type { QueryCache } from "./cache.ts";
import { ensureFetch, invalidateEntries, type LifecycleContext } from "./lifecycle.ts";

export interface MutateOptions {
  cache: QueryCache;
  lifecycle: LifecycleContext;
  defaultStaleAfter: number;
}

export async function runMutate<T>(def: MutateDef<T>, opts: MutateOptions): Promise<T> {
  const entry = opts.cache.ensureForMutate<T>(def.key, opts.defaultStaleAfter);
  const snapshot = entry.data.value;

  if (def.optimistic) {
    entry.data.value = def.optimistic(snapshot);
  }

  try {
    const token = await opts.lifecycle.getToken();
    const result = await def.commit({ token, fetch: opts.lifecycle.fetch });
    entry.data.value = result;
    entry.status.value = "success";
    entry.error.value = undefined;
    entry.fetchedAt = Date.now();
    entry.isStale.value = false;

    if (def.invalidate?.length) {
      for (const key of def.invalidate) {
        const matches = opts.cache.entriesMatchingPrefix(key);
        invalidateEntries(matches);
        await Promise.all(matches.map((e) => ensureFetch(e, opts.lifecycle, { force: true })));
      }
    }

    return result;
  } catch (err) {
    entry.data.value = snapshot;
    entry.error.value = err;
    // Only flip status to error if we had no prior success data path; keep success if rolled back data
    if (snapshot === undefined) {
      entry.status.value = "error";
    }
    throw err;
  }
}
