import { signal, type Signal } from "@preact/signals-core";
import { keyMatchesPrefix, serializeKey } from "../core/serialize-key.ts";
import type { FetchContext, QueryKey, QueryScope, QueryStatus } from "../core/types.ts";

export interface QueryEntry<T = unknown> {
  readonly key: QueryKey;
  readonly serializedKey: string;
  scope?: QueryScope;
  staleAfter: number;
  fetchFn: (ctx: FetchContext) => Promise<T>;
  enabled: () => boolean;
  data: Signal<T | undefined>;
  status: Signal<QueryStatus>;
  error: Signal<unknown>;
  isFetching: Signal<boolean>;
  isStale: Signal<boolean>;
  fetchedAt: number | null;
  inflight: Promise<void> | null;
}

export class QueryCache {
  #entries = new Map<string, QueryEntry>();

  get<T = unknown>(key: QueryKey): QueryEntry<T> | undefined {
    return this.#entries.get(serializeKey(key)) as QueryEntry<T> | undefined;
  }

  getOrCreate<T>(opts: {
    key: QueryKey;
    fetchFn: (ctx: FetchContext) => Promise<T>;
    enabled?: () => boolean;
    scope?: QueryScope;
    staleAfter: number;
  }): QueryEntry<T> {
    const serializedKey = serializeKey(opts.key);
    const existing = this.#entries.get(serializedKey) as QueryEntry<T> | undefined;
    if (existing) {
      // Keep latest fetch / config if re-registered with same key
      existing.fetchFn = opts.fetchFn;
      existing.enabled = opts.enabled ?? existing.enabled;
      existing.scope = opts.scope ?? existing.scope;
      existing.staleAfter = opts.staleAfter;
      return existing;
    }

    const entry: QueryEntry<T> = {
      key: opts.key,
      serializedKey,
      scope: opts.scope,
      staleAfter: opts.staleAfter,
      fetchFn: opts.fetchFn,
      enabled: opts.enabled ?? (() => true),
      data: signal<T | undefined>(undefined),
      status: signal<QueryStatus>("idle"),
      error: signal<unknown>(undefined),
      isFetching: signal(false),
      isStale: signal(true),
      fetchedAt: null,
      inflight: null,
    };
    this.#entries.set(serializedKey, entry as QueryEntry);
    return entry;
  }

  /** Create a bare entry for mutate when no prior query exists. */
  ensureForMutate<T>(key: QueryKey, staleAfter: number): QueryEntry<T> {
    const existing = this.get<T>(key);
    if (existing) return existing;
    return this.getOrCreate<T>({
      key,
      fetchFn: async () => {
        throw new Error(`No fetch registered for key ${serializeKey(key)}`);
      },
      staleAfter,
    });
  }

  entries(): IterableIterator<QueryEntry> {
    return this.#entries.values();
  }

  entriesForScope(scope: QueryScope): QueryEntry[] {
    return [...this.#entries.values()].filter((e) => e.scope === scope);
  }

  entriesMatchingPrefix(prefix: QueryKey): QueryEntry[] {
    return [...this.#entries.values()].filter((e) => keyMatchesPrefix(e.key, prefix));
  }

  delete(key: QueryKey): boolean {
    return this.#entries.delete(serializeKey(key));
  }

  clearEntry(entry: QueryEntry): void {
    entry.data.value = undefined;
    entry.status.value = "idle";
    entry.error.value = undefined;
    entry.isFetching.value = false;
    entry.isStale.value = true;
    entry.fetchedAt = null;
    entry.inflight = null;
  }

  /** Reset all entries for a scope in place (keeps Query handles valid). */
  clearScope(scope: QueryScope): void {
    for (const entry of this.entriesForScope(scope)) {
      this.clearEntry(entry);
    }
  }

  clear(): void {
    this.#entries.clear();
  }
}

export function isEntryStale(entry: QueryEntry, now = Date.now()): boolean {
  if (entry.fetchedAt === null) return true;
  if (entry.isStale.value) return true;
  return now - entry.fetchedAt >= entry.staleAfter;
}
