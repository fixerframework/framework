import { signal } from "@preact/signals-core";
import { createHistory, resolveHistoryKind } from "./history.ts";
import { matchRoutes, paramsFromMatches } from "./match.ts";
import { applyBase, parsePath, stripBase } from "./path.ts";
import type {
  CreateRouterOptions,
  HistoryAdapter,
  HistoryLocation,
  LocationState,
  NavigateOptions,
  NavigationStatus,
  RouteMatch,
  RouterRuntime,
} from "./types.ts";
import { LoaderCache } from "../loaders/loader-cache.ts";
import { runLoaders } from "../loaders/run-loaders.ts";

const MAX_REDIRECTS = 10;

function parseTo(
  to: string,
  base: string,
): { pathname: string; search: string; hash: string } {
  if (to.startsWith("http://") || to.startsWith("https://")) {
    const u = new URL(to);
    return {
      pathname: stripBase(u.pathname, base),
      search: u.search,
      hash: u.hash,
    };
  }
  const parsed = parsePath(to);
  return {
    pathname: stripBase(parsed.pathname, base),
    search: parsed.search,
    hash: parsed.hash,
  };
}

export function createRouter(options: CreateRouterOptions): RouterRuntime {
  const routes = options.routes;
  const base = options.base ?? "/";
  const kind = resolveHistoryKind(options.history);
  const history: HistoryAdapter = createHistory(kind, {
    initialPath: options.initialPath,
    initialEntries: options.initialEntries,
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
  const status = signal<NavigationStatus>("idle");
  const error = signal<unknown>(null);

  const loaderCache = new LoaderCache();
  let committedData: Record<string, unknown> = {};

  let navSeq = 0;
  let controller: AbortController | null = null;
  let started = false;
  let unlisten: (() => void) | null = null;
  /** Redirects initiated while handling a navigation (avoid extra history churn tracking). */
  let redirectDepth = 0;

  const commit = (
    loc: LocationState,
    nextMatches: RouteMatch[],
    data: Record<string, unknown>,
  ) => {
    location.value = loc;
    matches.value = nextMatches;
    params.value = paramsFromMatches(nextMatches);
    committedData = data;
    error.value = null;
    status.value = "ready";
  };

  const applyHistoryLoc = async (histLoc: HistoryLocation): Promise<void> => {
    const appPathname = stripBase(histLoc.pathname, base);
    const nextMatches = matchRoutes(routes, appPathname);

    if (!nextMatches) {
      status.value = "error";
      error.value = new Error(`No route matched: ${appPathname}`);
      location.value = {
        pathname: appPathname,
        search: histLoc.search,
        hash: histLoc.hash,
        state: histLoc.state,
      };
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
        try {
          navigateTo(to, { ...navOpts, replace: navOpts?.replace ?? true });
        } finally {
          // depth decremented after nested apply completes via same stack
        }
      },
      cache: loaderCache,
    });

    if (seq !== navSeq || signal.aborted) {
      return;
    }

    if (!outcome.ok) {
      if ("redirect" in outcome && outcome.redirect) {
        if (redirectDepth >= MAX_REDIRECTS) {
          status.value = "error";
          error.value = new Error("Redirect loop detected");
          return;
        }
        redirectDepth += 1;
        const depth = redirectDepth;
        navigateTo(outcome.redirect.to, { replace: outcome.redirect.replace });
        // apply will run from history listener; reset depth after max chain
        if (depth >= MAX_REDIRECTS) {
          /* applyHistoryLoc will catch on next */
        }
        return;
      }
      if (outcome.error instanceof DOMException && outcome.error.name === "AbortError") {
        return;
      }
      status.value = "error";
      error.value = outcome.error;
      return;
    }

    redirectDepth = 0;
    commit(
      {
        pathname: appPathname,
        search: histLoc.search,
        hash: histLoc.hash,
        state: histLoc.state,
      },
      nextMatches,
      outcome.data,
    );
  };

  const navigateTo = (to: string, opts: NavigateOptions = {}): void => {
    if (redirectDepth > MAX_REDIRECTS) {
      status.value = "error";
      error.value = new Error("Redirect loop detected");
      return;
    }

    const parsed = parseTo(to, base);
    const fullPathname = applyBase(parsed.pathname, base);
    const histLoc: HistoryLocation = {
      pathname: fullPathname,
      search: parsed.search,
      hash: parsed.hash,
      state: opts.state ?? null,
    };

    if (opts.replace) {
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
    // History adapter notifies listeners → applyHistoryLoc
  };

  const runtime: RouterRuntime = {
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
        return () => {
          unlisten?.();
          unlisten = null;
          started = false;
          controller?.abort();
        };
      }
      started = true;
      unlisten = history.listen((loc) => {
        void applyHistoryLoc(loc);
      });

      // Initial match (listen does not fire for current entry)
      void applyHistoryLoc(history.location);

      return () => {
        unlisten?.();
        unlisten = null;
        started = false;
        controller?.abort();
      };
    },
    getLoaderData(routeId: string) {
      return committedData[routeId];
    },
    __history: history,
  };

  return runtime;
}
