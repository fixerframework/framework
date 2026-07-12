import { computed, type ReadonlySignal } from "@preact/signals-core";

export function createDerive<T>(fn: () => T): ReadonlySignal<T> {
  return computed(fn);
}
