import type { Query } from "@fixerframework/state";
import type { ComponentChildren } from "preact";
import { useSignalValue } from "../lib/use-signal-value.ts";

function resolveSlot(
  slot: ComponentChildren | (() => ComponentChildren) | undefined,
): ComponentChildren {
  if (slot === undefined) return null;
  if (typeof slot === "function") return (slot as () => ComponentChildren)();
  return slot;
}

export interface AwaitProps<T> {
  query: Query<T>;
  /** Shown while status is idle/pending and data is undefined. */
  pending?: ComponentChildren | (() => ComponentChildren);
  /** Shown when status is error and no data is available. */
  error?: ComponentChildren | ((err: unknown) => ComponentChildren);
  children: (data: T) => ComponentChildren;
}

/**
 * Branch UI on a `@fixerframework/state` query.
 */
export function Await<T>({ query, pending, error, children }: AwaitProps<T>) {
  const status = useSignalValue(query.status);
  const data = useSignalValue(query.data);
  const err = useSignalValue(query.error);

  if (status === "error" && data === undefined) {
    if (typeof error === "function") {
      return <>{(error as (e: unknown) => ComponentChildren)(err)}</>;
    }
    return <>{error ?? null}</>;
  }

  if (data === undefined) {
    return <>{resolveSlot(pending)}</>;
  }

  return <>{children(data)}</>;
}
