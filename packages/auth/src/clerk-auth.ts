import { signal } from "@preact/signals-core";
import { Clerk } from "@clerk/clerk-js";
import type { ClerkAuthRuntime, CreateClerkAuthConfig } from "./types.ts";

/**
 * Minimal browser Clerk runtime for the unified signal store.
 * Loads Clerk client-side and exposes signals + getToken / onChange.
 */
export function createClerkAuth(config: CreateClerkAuthConfig): ClerkAuthRuntime {
  const isLoaded = signal(false);
  const userId = signal<string | null>(null);

  const clerk = new Clerk(config.publishableKey);
  const listeners = new Set<(prev: string | null, next: string | null) => void>();

  const applyIdentity = (next: string | null) => {
    const prev = userId.value;
    if (prev === next) return;
    userId.value = next;
    for (const cb of listeners) {
      cb(prev, next);
    }
  };

  const syncFromClerk = () => {
    applyIdentity(clerk.user?.id ?? null);
  };

  // Load asynchronously; consumers gate on isLoaded
  void clerk
    .load(config.loadOptions as Parameters<Clerk["load"]>[0])
    .then(() => {
      syncFromClerk();
      isLoaded.value = true;
      clerk.addListener(() => {
        syncFromClerk();
      });
    })
    .catch((err: unknown) => {
      console.error("[createClerkAuth] failed to load Clerk", err);
      isLoaded.value = true;
      applyIdentity(null);
    });

  return {
    isLoaded,
    userId,
    async getToken() {
      if (!clerk.session) return null;
      try {
        return (await clerk.session.getToken()) ?? null;
      } catch {
        return null;
      }
    },
    onChange(cb) {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
  };
}
