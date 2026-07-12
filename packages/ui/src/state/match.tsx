import type { ReadonlySignal, Signal } from "@preact/signals-core";
import type { ComponentChildren } from "preact";
import { useSignalValue } from "../lib/use-signal-value.ts";

export type MatchValue<T extends string | number | symbol> = T | Signal<T> | ReadonlySignal<T>;

export interface MatchProps<T extends string | number | symbol> {
  value: MatchValue<T>;
  children: Partial<Record<T, ComponentChildren | (() => ComponentChildren)>> & {
    /** Fallback when no case matches. */
    _?: ComponentChildren | (() => ComponentChildren);
  };
}

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
