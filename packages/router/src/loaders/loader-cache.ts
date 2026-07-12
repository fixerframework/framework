export interface LoaderEntry {
  data: unknown;
  error: unknown;
  /** Match identity used to decide reuse: route id + serialized params for that segment. */
  key: string;
}

export class LoaderCache {
  private map = new Map<string, LoaderEntry>();

  get(routeId: string): LoaderEntry | undefined {
    return this.map.get(routeId);
  }

  set(routeId: string, entry: LoaderEntry): void {
    this.map.set(routeId, entry);
  }

  clear(): void {
    this.map.clear();
  }

  /** Drop entries not in the active set of route ids. */
  retain(ids: Iterable<string>): void {
    const keep = new Set(ids);
    for (const id of this.map.keys()) {
      if (!keep.has(id)) this.map.delete(id);
    }
  }
}

export function loaderReuseKey(routeId: string, params: Record<string, string>): string {
  const keys = Object.keys(params).sort();
  const body = keys.map((k) => `${k}=${params[k]}`).join("&");
  return `${routeId}?${body}`;
}
