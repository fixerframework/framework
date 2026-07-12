import { signal } from "@preact/signals-core";
import { createHistory, resolveHistoryKind } from "./history.ts";
import { matchRoutes, paramsFromMatches } from "./match.ts";
import { applyBase, applyBaseToPath, resolvePath, stripBase } from "./path.ts";
import type {
  CreateRouterOptions,
  HistoryAdapter,
  HistoryLocation,
  LocationState,
  NavigateOptions,
  RouteMatch,
  RouterRuntime,
} from "./types.ts";
import { LoaderCache } from "../loaders/loader-cache.ts";
import { runLoaders } from "../loaders/run-loaders.ts";

const MAX_REDIRECTS = 10;

function parseTo(
  to: string,
  base: string,
  fromPathname: string,
): { pathname: string; search: string; hash: string } {
  if (to.startsWith("http://") || to.startsWith("https://")) {
    const u = new URL(to);
    return {
      pathname: stripBase(u.pathname, base),
      search: u.search,
      hash: u.hash,
    };
  }

  const resolved = resolvePath(fromPathname, to);

  // If caller used a full path that already includes base, strip it.
  return {
    pathname: stripBase(resolved.pathname, base),
    search: resolved.search,
    hash: resolved.hash,
  };
}

export function createRouter(options: CreateRouterOptions): RouterRuntime {
  const routes = options.routes;
  const base = options.base ?? "/";
  const kind = resolveHistoryKind(options.history);

  // History stores browser-absolute paths (with base). App signals store base-stripped paths.
  const history: HistoryAdapter = createHistory(kind, {
    initialPath: applyBaseToPath(options.initialPath ?? "/", base),
    initialEntries: options.initialEntries?.map((e) => applyBaseToPath(e, base)),
    base,
  });

  const location = signal<LocationState>({
    pathname: "/",
    search: "",
    hash: "",
    state: null,
  });
  const params = signal<Record<string, string>>({});
  const matches = signal<RouteMatch[]>([]);
  const status = signal<"idle" | "loading" | "ready" | "error">("idle");
  const error = signal<unknown>(null);

  const loaderCache = new LoaderCache();
  let committedData: Record<string, unknown> = {};

  let navSeq = 0;
  let controller: AbortController | null = null;
  let started = false;
  let unlisten: (() => void) | null = null;
  /** Counts redirects in the current chain; reset on success, public navigate, dispose. */
  let redirectDepth = 0;

  const toLoc = (histLoc: HistoryLocation, appPathname: string): LocationState => ({
    pathname: appPathname,
    search: histLoc.search,
    hash: histLoc.hash,
    state: histLoc.state,
  });

  const commit = (loc: LocationState, nextMatches: RouteMatch[], data: Record<string, unknown>) => {
    location.value = loc;
    matches.value = nextMatches;
    params.value = paramsFromMatches(nextMatches);
    committedData = data;
    error.value = null;
    status.value = "ready";
  };

  const commitError = (
    loc: LocationState,
    nextMatches: RouteMatch[],
    err: unknown,
    data: Record<string, unknown>,
  ) => {
    location.value = loc;
    matches.value = nextMatches;
    params.value = paramsFromMatches(nextMatches);
    committedData = data;
    error.value = err;
    status.value = "error";
  };

  const applyHistoryLoc = async (histLoc: HistoryLocation): Promise<void> => {
    const appPathname = stripBase(histLoc.pathname, base);
    const nextMatches = matchRoutes(routes, appPathname);
    const loc = toLoc(histLoc, appPathname);

    if (!nextMatches) {
      status.value = "error";
      error.value = new Error(`No route matched: ${appPathname}`);
      location.value = loc;
      matches.value = [];
      params.value = {};
      committedData = {};
      return;
    }

    const seq = ++navSeq;
    controller?.abort();
    controller = new AbortController();
    const signal = controller.signal;

    const hasLoaders = nextMatches.some((m) => m.route.loader || m.route.beforeLoad);
    if (hasLoaders) {
      status.value = "loading";
    }

    const prevMatches = matches.value;

    const outcome = await runLoaders({
      matches: nextMatches,
      prevMatches,
      pathname: appPathname,
      search: histLoc.search,
      signal,
      navigate: (to, navOpts) => {
        redirectDepth += 1;
        navigateTo(to, { ...navOpts, replace: navOpts?.replace ?? true });
      },
      cache: loaderCache,
    });

    if (seq !== navSeq || signal.aborted) {
      return;
    }

    if (!outcome.ok) {
      if ("redirect" in outcome && outcome.redirect) {
        redirectDepth += 1;
        if (redirectDepth > MAX_REDIRECTS) {
          commitError(loc, nextMatches, new Error("Redirect loop detected"), {});
          redirectDepth = 0;
          return;
        }
        navigateTo(outcome.redirect.to, { replace: outcome.redirect.replace });
        return;
      }
      if (outcome.error instanceof DOMException && outcome.error.name === "AbortError") {
        return;
      }
      // Commit target location + matches so URL and UI stay aligned; keep ancestor loader data.
      commitError(loc, nextMatches, outcome.error, outcome.data ?? {});
      return;
    }

    redirectDepth = 0;
    commit(loc, nextMatches, outcome.data);
  };

  const navigateTo = (to: string, opts: NavigateOptions = {}): void => {
    if (redirectDepth > MAX_REDIRECTS) {
      status.value = "error";
      error.value = new Error("Redirect loop detected");
      redirectDepth = 0;
      return;
    }

    const fromPathname = location.value.pathname || "/";
    const parsed = parseTo(to, base, fromPathname);
    const fullPathname = applyBase(parsed.pathname, base);

    const sameUrl =
      parsed.pathname === location.value.pathname &&
      parsed.search === location.value.search &&
      parsed.hash === location.value.hash &&
      (opts.state ?? null) === location.value.state;

    if (sameUrl && !opts.replace) {
      // Avoid growing the history stack on identical navigations.
      return;
    }

    const histLoc: HistoryLocation = {
      pathname: fullPathname,
      search: parsed.search,
      hash: parsed.hash,
      state: opts.state ?? null,
    };

    if (opts.replace || sameUrl) {
      history.replace(histLoc);
    } else {
      history.push(histLoc);
    }

    if (opts.scroll !== false && typeof window !== "undefined" && kind === "browser") {
      try {
        window.scrollTo(0, 0);
      } catch {
        /* ignore */
      }
    }
  };

  const stop = () => {
    unlisten?.();
    unlisten = null;
    started = false;
    controller?.abort();
    controller = null;
    redirectDepth = 0;
    if (status.value === "loading") {
      status.value = "idle";
    }
    // Detach popstate via listen unsub (refcount). Full dispose left for tests /
    // process teardown so Strict Mode remount can start() again on the same instance.
  };

  const runtime: RouterRuntime = {
    base,
    location,
    params,
    matches,
    status,
    error,
    navigate(to, opts) {
      redirectDepth = 0;
      navigateTo(to, opts ?? {});
    },
    back() {
      history.back();
    },
    start() {
      if (started) {
        return stop;
      }
      started = true;
      unlisten = history.listen((loc) => {
        void applyHistoryLoc(loc);
      });

      // Initial match (listen does not fire for current entry)
      void applyHistoryLoc(history.location);

      return stop;
    },
    getLoaderData(routeId: string) {
      return committedData[routeId];
    },
    __history: history,
  };

  return runtime;
}
