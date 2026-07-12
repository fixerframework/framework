/**
 * Internal re-export of router types from `@fixerframework/types`.
 * Public consumers should import types from `@fixerframework/types` / `@fixerframework/types/router`.
 *
 * Runtime redirect helpers stay in this package.
 */

export type {
  NavigationStatus,
  LocationState,
  NavigateOptions,
  LoaderContext,
  RouteDef,
  RouteMatch,
  HistoryLocation,
  HistoryAdapter,
  HistoryKind,
  CreateRouterOptions,
  RouterRuntime,
  RouterProps,
  LinkProps,
} from "@fixerframework/types/router";

/** Thrown (or constructed) to trigger a client redirect during load. */
export class Redirect {
  readonly to: string;
  readonly replace: boolean;
  constructor(to: string, opts?: { replace?: boolean }) {
    this.to = to;
    this.replace = opts?.replace ?? true;
  }
}

export function redirect(to: string, opts?: { replace?: boolean }): Redirect {
  return new Redirect(to, opts);
}

export function isRedirect(value: unknown): value is Redirect {
  return value instanceof Redirect;
}
