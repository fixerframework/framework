import { signal } from "@preact/signals-core";
import type { AuthRuntime } from "../src/core/types.ts";

export function createMockAuth(initial?: {
  isLoaded?: boolean;
  userId?: string | null;
  token?: string | null;
}): AuthRuntime & {
  setLoaded: (v: boolean) => void;
  setUserId: (id: string | null) => void;
  setToken: (t: string | null) => void;
} {
  const isLoaded = signal(initial?.isLoaded ?? false);
  const userId = signal<string | null>(initial?.userId ?? null);
  let token: string | null = initial?.token ?? "test-token";
  const listeners = new Set<(prev: string | null, next: string | null) => void>();

  return {
    isLoaded,
    userId,
    async getToken() {
      return token;
    },
    onChange(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    setLoaded(v: boolean) {
      isLoaded.value = v;
    },
    setUserId(id: string | null) {
      const prev = userId.value;
      if (prev === id) return;
      userId.value = id;
      for (const cb of listeners) cb(prev, id);
    },
    setToken(t: string | null) {
      token = t;
    },
  };
}

export { deferred } from "@fixerframework/utils";

export async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, 0);
  await promise;
}
