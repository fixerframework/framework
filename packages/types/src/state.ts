import type { ReadonlySignal, Signal } from "@preact/signals-core";
import type { AuthRuntime } from "./auth.ts";

export type { AuthRuntime };

export type QueryKey = readonly unknown[];
export type QueryStatus = "idle" | "pending" | "success" | "error";
export type QueryScope = "user";

export interface FetchContext {
  token: string | null;
  fetch: typeof globalThis.fetch;
}

export interface QueryDef<T> {
  key: QueryKey;
  fetch: (ctx: FetchContext) => Promise<T>;
  scope?: QueryScope;
  enabled?: () => boolean;
  staleAfter?: number;
}

export interface MutateDef<T> {
  key: QueryKey;
  optimistic?: (current: T | undefined) => T;
  commit: (ctx: FetchContext) => Promise<T>;
  /** Additional keys to invalidate after a successful commit. */
  invalidate?: QueryKey[];
}

export interface Query<T> {
  readonly data: Signal<T | undefined>;
  readonly status: Signal<QueryStatus>;
  readonly error: Signal<unknown>;
  readonly isFetching: Signal<boolean>;
  readonly isStale: Signal<boolean>;
  refetch(): Promise<void>;
}

export type Atom<T> = Signal<T>;

export interface CreateStateOptions {
  auth?: AuthRuntime;
  /** Default stale time in ms. Defaults to 60_000. */
  staleAfter?: number;
  fetch?: typeof globalThis.fetch;
}

export interface StateRuntime {
  atom<T>(initial: T, opts?: { id?: string }): Signal<T>;
  derive<T>(fn: () => T): ReadonlySignal<T>;
  query<T>(def: QueryDef<T>): Query<T>;
  mutate<T>(def: MutateDef<T>): Promise<T>;
  invalidate(key: QueryKey): void;
  invalidateScope(scope: QueryScope): void;
  configure(opts: { fetch?: typeof globalThis.fetch; staleAfter?: number }): void;
}
