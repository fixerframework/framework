import type { HistoryAdapter, HistoryLocation, HistoryKind } from "./types.ts";
import { locationToPath, normalizePathname, parsePath } from "./path.ts";

function cloneLoc(loc: HistoryLocation): HistoryLocation {
  return {
    pathname: loc.pathname,
    search: loc.search,
    hash: loc.hash,
    state: loc.state,
  };
}

export function createMemoryHistory(options?: {
  initialEntries?: string[];
  initialPath?: string;
}): HistoryAdapter {
  const entries = (options?.initialEntries ?? [options?.initialPath ?? "/"]).map((raw) => {
    const p = parsePath(raw);
    return {
      pathname: p.pathname,
      search: p.search,
      hash: p.hash,
      state: null as unknown,
    };
  });
  let index = entries.length - 1;
  const listeners = new Set<(loc: HistoryLocation) => void>();
  let disposed = false;

  const current = (): HistoryLocation => cloneLoc(entries[index]!);

  const notify = () => {
    if (disposed) return;
    const loc = current();
    for (const l of listeners) l(loc);
  };

  return {
    get location() {
      return current();
    },
    push(to) {
      if (disposed) return;
      entries.splice(index + 1);
      entries.push(cloneLoc(to));
      index = entries.length - 1;
      notify();
    },
    replace(to) {
      if (disposed) return;
      entries[index] = cloneLoc(to);
      notify();
    },
    back() {
      if (disposed) return;
      if (index > 0) {
        index -= 1;
        notify();
      }
    },
    listen(listener) {
      if (disposed) return () => {};
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose() {
      disposed = true;
      listeners.clear();
    },
  };
}

export function createBrowserHistory(_options?: { base?: string }): HistoryAdapter {
  const listeners = new Set<(loc: HistoryLocation) => void>();
  let disposed = false;
  let attached = false;

  const read = (): HistoryLocation => {
    return {
      pathname: normalizePathname(window.location.pathname),
      search: window.location.search,
      hash: window.location.hash,
      state: window.history.state,
    };
  };

  const onPop = () => {
    if (disposed) return;
    const loc = read();
    for (const l of listeners) l(loc);
  };

  const attach = () => {
    if (attached || disposed || typeof window === "undefined") return;
    window.addEventListener("popstate", onPop);
    attached = true;
  };

  const detach = () => {
    if (!attached || typeof window === "undefined") return;
    window.removeEventListener("popstate", onPop);
    attached = false;
  };

  return {
    get location() {
      return typeof window !== "undefined"
        ? read()
        : { pathname: "/", search: "", hash: "", state: null };
    },
    push(to) {
      if (disposed) return;
      const url = locationToPath(to);
      window.history.pushState(to.state ?? null, "", url);
      for (const l of listeners) l(cloneLoc(to));
    },
    replace(to) {
      if (disposed) return;
      const url = locationToPath(to);
      window.history.replaceState(to.state ?? null, "", url);
      for (const l of listeners) l(cloneLoc(to));
    },
    back() {
      if (disposed) return;
      window.history.back();
    },
    listen(listener) {
      if (disposed) return () => {};
      listeners.add(listener);
      attach();
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) detach();
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      listeners.clear();
      detach();
    },
  };
}

export function createHistory(
  kind: HistoryKind,
  options?: { initialPath?: string; initialEntries?: string[]; base?: string },
): HistoryAdapter {
  if (kind === "memory") {
    return createMemoryHistory(options);
  }
  return createBrowserHistory(options);
}

export function resolveHistoryKind(explicit?: HistoryKind): HistoryKind {
  if (explicit) return explicit;
  return typeof window !== "undefined" && typeof window.history !== "undefined"
    ? "browser"
    : "memory";
}
