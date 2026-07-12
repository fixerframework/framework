import type { ComponentChildren, ComponentType, JSX } from "preact";
import type { Signal } from "@preact/signals-core";

export type NavigationStatus = "idle" | "loading" | "ready" | "error";

export interface LocationState {
  pathname: string;
  search: string;
  hash: string;
  state: unknown;
}

export interface NavigateOptions {
  replace?: boolean;
  state?: unknown;
  /** Skip scroll-to-top on push (default false). */
  scroll?: boolean;
}

export interface LoaderContext {
  params: Record<string, string>;
  pathname: string;
  /** Search string including `?`, or `""`. Loader reuse includes search (not hash). */
  search: string;
  searchParams: URLSearchParams;
  signal: AbortSignal;
  navigate: (to: string, opts?: NavigateOptions) => void;
  /** Loader results for ancestor routes already resolved this navigation. */
  parentData: Record<string, unknown>;
}

export interface RouteDef {
  /** Unique id for loader data lookup. Auto-derived from full path if omitted. */
  id?: string;
  /** Path segment relative to parent (e.g. `"blog"`, `":slug"`, `"*rest"`). Use `""` or `"/"` for layout roots. */
  path: string;
  component?: ComponentType<Record<string, never>>;
  /** When true, matches only when parent path is exact (no extra segments). */
  index?: boolean;
  loader?: (ctx: LoaderContext) => Promise<unknown> | unknown;
  beforeLoad?: (ctx: LoaderContext) => void | Promise<void>;
  children?: RouteDef[];
}

export interface RouteMatch {
  /** Resolved route id. */
  id: string;
  route: RouteDef;
  /** Params contributed by this segment only. */
  params: Record<string, string>;
  /** Full accumulated params root → this segment. */
  pathname: string;
  /** Absolute pattern used for this match leaf path. */
  pattern: string;
}

export interface HistoryLocation {
  pathname: string;
  search: string;
  hash: string;
  state: unknown;
}

export interface HistoryAdapter {
  readonly location: HistoryLocation;
  push(to: HistoryLocation): void;
  replace(to: HistoryLocation): void;
  back(): void;
  listen(listener: (loc: HistoryLocation) => void): () => void;
  /** Release global listeners (e.g. `popstate`). Safe to call more than once. */
  dispose?(): void;
}

export type HistoryKind = "browser" | "memory";

export interface CreateRouterOptions {
  routes: RouteDef[];
  /** Default: `"browser"` when `window` exists, else `"memory"`. */
  history?: HistoryKind;
  /** Initial path for memory history (and first match). Default `"/"`. */
  initialPath?: string;
  /** Deploy under a subpath, e.g. `"/app"`. */
  base?: string;
  /** Memory history initial stack (overrides initialPath if provided). */
  initialEntries?: string[];
}

export interface RouterRuntime {
  /** Deploy base (e.g. `"/app"`), or `"/"` when none. History URLs include base; `location` does not. */
  readonly base: string;
  readonly location: Signal<LocationState>;
  readonly params: Signal<Record<string, string>>;
  readonly matches: Signal<RouteMatch[]>;
  readonly status: Signal<NavigationStatus>;
  readonly error: Signal<unknown>;
  navigate(to: string, opts?: NavigateOptions): void;
  back(): void;
  /** Attach history listener and run initial match. Returns dispose. */
  start(): () => void;
  getLoaderData(routeId: string): unknown;
  /** @internal test/helpers */
  readonly __history: HistoryAdapter;
}

export interface RouterProps {
  router: RouterRuntime;
  /** Shown when status is loading and there is no committed match yet. */
  fallback?: ComponentChildren;
  children?: ComponentChildren;
}

export interface LinkProps extends Omit<JSX.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  href: string;
  /** When true, aria-current only if pathname equals href path exactly. Default: prefix match. */
  exact?: boolean;
  replace?: boolean;
}
