import type { AuthRuntime, QueryScope } from "../core/types.ts";
import type { QueryCache } from "../query/cache.ts";
import { invalidateEntries, type LifecycleContext } from "../query/lifecycle.ts";
import { refetchEligible } from "../query/query.ts";

/**
 * Subscribe to auth identity changes:
 * - user change → invalidate user-scoped cache + refetch eligible
 * - sign-out → clear user-scoped entries entirely
 */
export function wireAuthScope(
  auth: AuthRuntime,
  cache: QueryCache,
  lifecycle: LifecycleContext,
): () => void {
  return auth.onChange((prev, next) => {
    if (prev === next) return;

    if (next === null) {
      cache.clearScope("user");
      return;
    }

    // Signed in or switched users
    const scoped = cache.entriesForScope("user");
    invalidateEntries(scoped);
    // Drop previous user's data when identity actually changed (not first load from null)
    if (prev !== null) {
      for (const entry of scoped) {
        entry.data.value = undefined;
        entry.status.value = "idle";
        entry.fetchedAt = null;
      }
    }
    refetchEligible(cache, lifecycle);
  });
}

export function isUserScopeReady(auth: AuthRuntime | undefined): boolean {
  if (!auth) return false;
  return auth.isLoaded.value === true && auth.userId.value !== null;
}

export async function resolveToken(auth: AuthRuntime | undefined): Promise<string | null> {
  if (!auth) return null;
  if (!auth.isLoaded.value || auth.userId.value === null) return null;
  return auth.getToken();
}

export function clearScope(cache: QueryCache, scope: QueryScope): void {
  cache.clearScope(scope);
}
