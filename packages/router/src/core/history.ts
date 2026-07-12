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

  const current = (): HistoryLocation => cloneLoc(entries[index]!);

  const notify = () => {
    const loc = current();
    for (const l of listeners) l(loc);
  };

  return {
    get location() {
      return current();
    },
    push(to) {
      entries.splice(index + 1);
      entries.push(cloneLoc(to));
      index = entries.length - 1;
      notify();
    },
    replace(to) {
      entries[index] = cloneLoc(to);
      notify();
    },
    back() {
      if (index > 0) {
        index -= 1;
        notify();
      }
    },
    listen(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function createBrowserHistory(_options?: { base?: string }): HistoryAdapter {
  const listeners = new Set<(loc: HistoryLocation) => void>();

  const read = (): HistoryLocation => {
    return {
      pathname: normalizePathname(window.location.pathname),
      search: window.location.search,
      hash: window.location.hash,
      state: window.history.state,
    };
  };

  const onPop = () => {
    const loc = read();
    for (const l of listeners) l(loc);
  };

  if (typeof window !== "undefined") {
    window.addEventListener("popstate", onPop);
  }

  return {
    get location() {
      return typeof window !== "undefined"
        ? read()
        : { pathname: "/", search: "", hash: "", state: null };
    },
    push(to) {
      const url = locationToPath(to);
      window.history.pushState(to.state ?? null, "", url);
      for (const l of listeners) l(cloneLoc(to));
    },
    replace(to) {
      const url = locationToPath(to);
      window.history.replaceState(to.state ?? null, "", url);
      for (const l of listeners) l(cloneLoc(to));
    },
    back() {
      window.history.back();
    },
    listen(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
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
