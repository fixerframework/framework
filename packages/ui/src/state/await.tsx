import type { ComponentChildren } from "preact";
import type { AwaitProps } from "@fixerframework/types/ui";
import { useSignalValue } from "../lib/use-signal-value.ts";

export type { AwaitProps };

function resolveSlot(
  slot: ComponentChildren | (() => ComponentChildren) | undefined,
): ComponentChildren {
  if (slot === undefined) return null;
  if (typeof slot === "function") return (slot as () => ComponentChildren)();
  return slot;
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
