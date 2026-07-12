import type {
  AuthRuntime,
  CreateStateOptions,
  MutateDef,
  QueryDef,
  QueryKey,
  QueryScope,
  StateRuntime,
} from "./core/types.ts";
import { Registry } from "./core/registry.ts";
import { createAtom } from "./primitives/atom.ts";
import { createDerive } from "./primitives/derive.ts";
import { QueryCache } from "./query/cache.ts";
import {
  ensureFetch,
  invalidateAndMaybeRefetch,
  invalidateEntries,
  type LifecycleContext,
} from "./query/lifecycle.ts";
import { createQuery, refetchEligible } from "./query/query.ts";
import { runMutate } from "./query/mutate.ts";
import { resolveToken, wireAuthScope } from "./auth/scope.ts";
import { effect } from "@preact/signals-core";

const DEFAULT_STALE_AFTER = 60_000;

export function createState(options: CreateStateOptions = {}): StateRuntime {
  const registry = new Registry();
  const cache = new QueryCache();
  let defaultStaleAfter = options.staleAfter ?? DEFAULT_STALE_AFTER;
  let fetchImpl: typeof globalThis.fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  const auth: AuthRuntime | undefined = options.auth;

  const lifecycle: LifecycleContext = {
    auth,
    get fetch() {
      return fetchImpl;
    },
    getToken: () => resolveToken(auth),
  };

  if (auth) {
    wireAuthScope(auth, cache, lifecycle);

    // When isLoaded / userId become ready, start eligible user-scoped queries
    effect(() => {
      const loaded = auth.isLoaded.value;
      const uid = auth.userId.value;
      if (loaded && uid !== null) {
        refetchEligible(cache, lifecycle);
      }
    });
  }

  const runtime: StateRuntime = {
    atom<T>(initial: T, opts?: { id?: string }) {
      return createAtom(registry, initial, opts);
    },

    derive<T>(fn: () => T) {
      return createDerive(fn);
    },

    query<T>(def: QueryDef<T>) {
      return createQuery(def, {
        cache,
        lifecycle,
        defaultStaleAfter,
      });
    },

    mutate<T>(def: MutateDef<T>) {
      return runMutate(def, {
        cache,
        lifecycle,
        defaultStaleAfter,
      });
    },

    invalidate(key: QueryKey) {
      void invalidateAndMaybeRefetch(cache, key, lifecycle, true);
    },

    invalidateScope(scope: QueryScope) {
      const entries = cache.entriesForScope(scope);
      invalidateEntries(entries);
      for (const entry of entries) {
        void ensureFetch(entry, lifecycle, { force: true });
      }
    },

    configure(opts: { fetch?: typeof globalThis.fetch; staleAfter?: number }) {
      if (opts.fetch) fetchImpl = opts.fetch;
      if (opts.staleAfter !== undefined) defaultStaleAfter = opts.staleAfter;
    },
  };

  return runtime;
}
