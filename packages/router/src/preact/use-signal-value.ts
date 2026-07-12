import type { ReadonlySignal, Signal } from "@preact/signals-core";
import { useLayoutEffect, useReducer } from "preact/hooks";

function isSignal<T>(v: T | Signal<T> | ReadonlySignal<T>): v is Signal<T> | ReadonlySignal<T> {
  return (
    typeof v === "object" &&
    v !== null &&
    "value" in v &&
    typeof (v as Signal<T>).subscribe === "function"
  );
}

/**
 * Subscribe to a signals-core Signal so the component re-renders on change.
 */
export function useSignalValue<T>(source: T | Signal<T> | ReadonlySignal<T>): T {
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  useLayoutEffect(() => {
    if (!isSignal(source)) return;
    const sig = source as Signal<T>;
    return sig.subscribe(() => {
      rerender(0);
    });
  }, [source]);

  if (isSignal(source)) {
    return (source as Signal<T>).value;
  }
  return source as T;
}
