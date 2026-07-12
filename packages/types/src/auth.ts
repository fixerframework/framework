import type { Signal } from "@preact/signals-core";

/**
 * Auth surface consumed by `@fixerframework/state` and implemented by
 * `@fixerframework/auth` (e.g. Clerk client bridge).
 */
export interface AuthRuntime {
  readonly isLoaded: Signal<boolean>;
  readonly userId: Signal<string | null>;
  getToken(): Promise<string | null>;
  onChange(cb: (prev: string | null, next: string | null) => void): () => void;
}

/** @deprecated Use {@link AuthRuntime}. Alias retained for migration. */
export type ClerkAuthRuntime = AuthRuntime;

export interface CreateClerkAuthConfig {
  publishableKey: string;
  /** Optional Clerk `load()` options (domain/proxy handled via Clerk constructor options if needed). */
  loadOptions?: Record<string, unknown>;
}
