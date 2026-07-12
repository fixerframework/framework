import type { Signal } from "@preact/signals-core";

/**
 * Auth surface expected by `@fixerframework/state`.
 * Defined here as a structural contract — state owns the canonical `AuthRuntime` type.
 */
export interface ClerkAuthRuntime {
  readonly isLoaded: Signal<boolean>;
  readonly userId: Signal<string | null>;
  getToken(): Promise<string | null>;
  onChange(cb: (prev: string | null, next: string | null) => void): () => void;
}

export interface CreateClerkAuthConfig {
  publishableKey: string;
  /** Optional Clerk `load()` options (domain/proxy handled via Clerk constructor options if needed). */
  loadOptions?: Record<string, unknown>;
}
