/** Strip trailing slash except for root `"/"`. */
export function normalizePathname(pathname: string): string {
  if (!pathname) return "/";
  let p = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p;
}

/** Join parent absolute path with a relative child segment. */
export function joinPaths(parent: string, child: string): string {
  const c = child === "/" ? "" : child.replace(/^\//, "").replace(/\/$/, "");
  if (!c || c === "") {
    return normalizePathname(parent || "/");
  }
  const base = parent === "/" ? "" : normalizePathname(parent);
  return normalizePathname(`${base}/${c}`);
}

export interface ParsedUrl {
  pathname: string;
  search: string;
  hash: string;
}

/** Parse a path string like `/blog?x=1#y` into parts. */
export function parsePath(to: string): ParsedUrl {
  if (!to) return { pathname: "/", search: "", hash: "" };
  let rest = to;
  let hash = "";
  const hashIdx = rest.indexOf("#");
  if (hashIdx >= 0) {
    hash = rest.slice(hashIdx);
    rest = rest.slice(0, hashIdx);
  }
  let search = "";
  const qIdx = rest.indexOf("?");
  if (qIdx >= 0) {
    search = rest.slice(qIdx);
    rest = rest.slice(0, qIdx);
  }
  return {
    pathname: normalizePathname(rest || "/"),
    search,
    hash,
  };
}

/** Apply base prefix: strip base from pathname for matching; add base when writing history. */
export function stripBase(pathname: string, base: string): string {
  const b = normalizePathname(base);
  if (b === "/") return normalizePathname(pathname);
  const p = normalizePathname(pathname);
  if (p === b) return "/";
  if (p.startsWith(`${b}/`)) return p.slice(b.length) || "/";
  return p;
}

export function applyBase(pathname: string, base: string): string {
  const b = normalizePathname(base);
  const p = normalizePathname(pathname);
  if (b === "/") return p;
  if (p === "/") return b;
  return normalizePathname(`${b}${p}`);
}

export function locationToPath(loc: { pathname: string; search?: string; hash?: string }): string {
  return `${loc.pathname}${loc.search ?? ""}${loc.hash ?? ""}`;
}
