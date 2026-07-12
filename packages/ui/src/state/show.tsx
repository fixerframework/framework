import type { ReadonlySignal, Signal } from "@preact/signals-core";
import type { ComponentChildren } from "preact";
import { isSignal } from "../lib/signal-open.ts";
import { useSignalValue } from "../lib/use-signal-value.ts";

export type ShowWhen<T> = T | Signal<T> | ReadonlySignal<T>;

export interface ShowProps<T> {
  /** Plain value or signal; truthy values render children. */
  when: ShowWhen<T>;
  /** Rendered when `when` is falsy. */
  fallback?: ComponentChildren;
  children: ComponentChildren | ((value: NonNullable<T>) => ComponentChildren);
}

/**
 * Conditionally render based on a signal or plain value.
 */
export function Show<T>({ when, fallback = null, children }: ShowProps<T>) {
  const value = useSignalValue(when);
  if (!value) return <>{fallback}</>;
  if (typeof children === "function") {
    return <>{(children as (v: NonNullable<T>) => ComponentChildren)(value as NonNullable<T>)}</>;
  }
  return <>{children}</>;
}

// re-export helper for tests
export { isSignal };
