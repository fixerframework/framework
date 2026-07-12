import { useContext } from "preact/hooks";
import type { LocationState, NavigationStatus, RouterRuntime } from "../core/types.ts";
import { RouterContext } from "./context.ts";
import { useSignalValue } from "./use-signal-value.ts";

export function useRouter(): RouterRuntime {
  const ctx = useContext(RouterContext);
  if (!ctx) {
    throw new Error("useRouter() must be used within <Router>");
  }
  return ctx.router;
}

export function useLocation(): LocationState {
  const router = useRouter();
  return useSignalValue(router.location);
}

export function useParams(): Record<string, string> {
  const router = useRouter();
  return useSignalValue(router.params);
}

export function useNavigation(): { status: NavigationStatus; error: unknown } {
  const router = useRouter();
  const status = useSignalValue(router.status);
  const error = useSignalValue(router.error);
  return { status, error };
}

/**
 * Loader data for a route. Defaults to the deepest matched route that has data.
 * Pass `routeId` to target a specific route.
 */
export function useLoaderData<T = unknown>(routeId?: string): T | undefined {
  const ctx = useContext(RouterContext);
  if (!ctx) {
    throw new Error("useLoaderData() must be used within <Router>");
  }
  // Re-render when location/status changes (loader data commits with them)
  useSignalValue(ctx.router.location);
  useSignalValue(ctx.router.status);

  const id =
    routeId ??
    [...ctx.matches].reverse().find((m) => ctx.router.getLoaderData(m.id) !== undefined)?.id ??
    ctx.matches[ctx.matches.length - 1]?.id;

  if (!id) return undefined;
  return ctx.router.getLoaderData(id) as T | undefined;
}
