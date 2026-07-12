import type { RouteDef, RouteMatch } from "./types.ts";
import { joinPaths, normalizePathname } from "./path.ts";

export interface CompiledRoute {
  id: string;
  route: RouteDef;
  /** Full absolute pattern, e.g. `/blog/:slug`. */
  pattern: string;
  /** Segments of the full pattern. */
  segments: PatternSegment[];
  /** Score for ranking: higher wins. */
  score: number;
  /** Chain root → this route (for nested matches). */
  chain: CompiledRoute[];
  index: boolean;
}

export type PatternSegment =
  | { kind: "static"; value: string }
  | { kind: "param"; name: string }
  | { kind: "splat"; name: string };

function segmentize(pattern: string): string[] {
  const p = normalizePathname(pattern);
  if (p === "/") return [];
  return p.slice(1).split("/").filter(Boolean);
}

export function parseSegments(pattern: string): PatternSegment[] {
  return segmentize(pattern).map((seg) => {
    if (seg.startsWith("*")) {
      return { kind: "splat" as const, name: seg.slice(1) || "rest" };
    }
    if (seg.startsWith(":")) {
      return { kind: "param" as const, name: seg.slice(1) };
    }
    return { kind: "static" as const, value: seg };
  });
}

/** Higher score = more specific. */
export function scorePattern(segments: PatternSegment[], index: boolean): number {
  let score = 0;
  for (const seg of segments) {
    if (seg.kind === "static") score += 10;
    else if (seg.kind === "param") score += 5;
    else score += 1;
  }
  score += segments.length * 0.01;
  if (index) score += 0.001;
  return score;
}

function resolveId(route: RouteDef, pattern: string): string {
  if (route.id) return route.id;
  if (route.index) return pattern === "/" ? "/index" : `${pattern}/index`;
  return pattern || "/";
}

/** Decode a path segment; returns null when the encoding is malformed. */
function decodeSeg(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

/**
 * Flatten a route tree into compiled match targets (leaves / index routes).
 */
export function compileRoutes(
  routes: RouteDef[],
  parentPattern = "",
  parentChain: CompiledRoute[] = [],
): CompiledRoute[] {
  const out: CompiledRoute[] = [];

  for (const route of routes) {
    const pattern = joinPaths(parentPattern || "/", route.path || "");
    const segments = parseSegments(pattern);
    const index = Boolean(route.index);
    const compiled: CompiledRoute = {
      id: resolveId(route, pattern),
      route,
      pattern,
      segments,
      score: scorePattern(segments, index),
      chain: [],
      index,
    };
    compiled.chain = [...parentChain, compiled];

    const children = route.children ?? [];
    if (children.length === 0) {
      out.push(compiled);
    } else {
      out.push(...compileRoutes(children, pattern, compiled.chain));
    }
  }

  return out;
}

export function compileAllTargets(routes: RouteDef[]): CompiledRoute[] {
  const leaves = compileRoutes(routes);
  const byId = new Map<string, CompiledRoute>();
  for (const leaf of leaves) {
    byId.set(leaf.id, leaf);
  }
  return [...byId.values()].sort((a, b) => b.score - a.score);
}

function matchSegments(
  segments: PatternSegment[],
  pathname: string,
): Record<string, string> | null {
  const parts = segmentize(pathname);
  const params: Record<string, string> = {};

  let i = 0;
  let j = 0;
  while (i < segments.length && j < parts.length) {
    const seg = segments[i]!;
    const part = parts[j]!;
    if (seg.kind === "static") {
      if (seg.value !== part) return null;
      i++;
      j++;
    } else if (seg.kind === "param") {
      const decoded = decodeSeg(part);
      if (decoded == null) return null;
      params[seg.name] = decoded;
      i++;
      j++;
    } else {
      const decoded = decodeSeg(parts.slice(j).join("/"));
      if (decoded == null) return null;
      params[seg.name] = decoded;
      i++;
      j = parts.length;
    }
  }

  if (i < segments.length) {
    const rest = segments[i]!;
    if (rest.kind === "splat" && i === segments.length - 1) {
      params[rest.name] = "";
      i++;
    } else {
      return null;
    }
  }

  if (j !== parts.length) return null;
  return params;
}

function matchPrefix(segments: PatternSegment[], pathname: string): Record<string, string> | null {
  const parts = segmentize(pathname);
  const params: Record<string, string> = {};
  let j = 0;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]!;
    if (j >= parts.length) {
      if (seg.kind === "splat") {
        params[seg.name] = "";
        continue;
      }
      return null;
    }
    const part = parts[j]!;
    if (seg.kind === "static") {
      if (seg.value !== part) return null;
      j++;
    } else if (seg.kind === "param") {
      const decoded = decodeSeg(part);
      if (decoded == null) return null;
      params[seg.name] = decoded;
      j++;
    } else {
      const decoded = decodeSeg(parts.slice(j).join("/"));
      if (decoded == null) return null;
      params[seg.name] = decoded;
      j = parts.length;
    }
  }
  return params;
}

function segmentOnlyParams(
  node: CompiledRoute,
  allParams: Record<string, string>,
): Record<string, string> {
  const parentSegNames = new Set<string>();
  const parent = node.chain[node.chain.length - 2];
  if (parent) {
    for (const seg of parent.segments) {
      if (seg.kind === "param" || seg.kind === "splat") parentSegNames.add(seg.name);
    }
  }
  const own: Record<string, string> = {};
  for (const seg of node.segments) {
    if (seg.kind === "param" || seg.kind === "splat") {
      if (seg.name in allParams && !parentSegNames.has(seg.name)) {
        own[seg.name] = allParams[seg.name]!;
      }
    }
  }
  return own;
}

function buildChainMatches(
  best: CompiledRoute,
  leafParams: Record<string, string>,
  path: string,
): RouteMatch[] {
  const matches: RouteMatch[] = [];
  let accumulated: Record<string, string> = {};

  for (const node of best.chain) {
    const prefixParams = matchPrefix(node.segments, path) ?? {};
    const paramsSource = node === best ? leafParams : prefixParams;
    const own = segmentOnlyParams(node, paramsSource);
    accumulated = { ...accumulated, ...own };
    matches.push({
      id: node.id,
      route: node.route,
      params: { ...accumulated },
      pathname: path,
      pattern: node.pattern,
    });
  }

  return matches;
}

/**
 * Match pathname against the route tree.
 * Returns ordered matches root → leaf, or null if no match.
 */
export function matchRoutes(routes: RouteDef[], pathname: string): RouteMatch[] | null {
  const path = normalizePathname(pathname);
  const targets = compileAllTargets(routes);

  let best: CompiledRoute | null = null;
  let bestParams: Record<string, string> | null = null;

  for (const target of targets) {
    const params = matchSegments(target.segments, path);
    if (params == null) continue;
    if (!best || target.score > best.score) {
      best = target;
      bestParams = params;
    }
  }

  if (!best || !bestParams) return null;
  return buildChainMatches(best, bestParams, path);
}

/** Accumulated params from the deepest match. */
export function paramsFromMatches(matches: RouteMatch[]): Record<string, string> {
  if (matches.length === 0) return {};
  return { ...matches[matches.length - 1]!.params };
}
