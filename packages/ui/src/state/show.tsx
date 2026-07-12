import type { ComponentChildren } from "preact";
import type { ShowProps } from "@fixerframework/types/ui";
import { isSignal } from "../lib/signal-open.ts";
import { useSignalValue } from "../lib/use-signal-value.ts";

export type { ShowProps, ShowWhen } from "@fixerframework/types/ui";

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
