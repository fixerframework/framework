import type { ComponentChildren } from "preact";
import type { MatchProps } from "@fixerframework/types/ui";
import { useSignalValue } from "../lib/use-signal-value.ts";

export type { MatchProps, MatchValue } from "@fixerframework/types/ui";

function renderSlot(
  slot: ComponentChildren | (() => ComponentChildren) | undefined,
): ComponentChildren {
  if (slot === undefined) return null;
  if (typeof slot === "function") return (slot as () => ComponentChildren)();
  return slot;
}

/**
 * Discriminated render on a string/number signal or plain value.
 */
export function Match<T extends string | number | symbol>({ value, children }: MatchProps<T>) {
  const key = useSignalValue(value);
  const slot = children[key] ?? children._;
  return <>{renderSlot(slot)}</>;
}
