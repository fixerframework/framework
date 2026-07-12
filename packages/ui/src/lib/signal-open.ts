import type { Signal } from "@preact/signals-core";
import { signal } from "@preact/signals-core";
import { useCallback, useLayoutEffect, useMemo, useReducer, useRef } from "preact/hooks";
import type { MaybeSignal } from "@fixerframework/types/ui";

export type { MaybeSignal };

/** True for preact signals-core Signal instances. */
export function isSignal<T>(v: unknown): v is Signal<T> {
  return (
    typeof v === "object" &&
    v !== null &&
    "value" in v &&
    "peek" in v &&
    typeof (v as { peek: unknown }).peek === "function"
  );
}

/** Read a plain value or Signal. */
export function readMaybeSignal<T>(v: MaybeSignal<T>): T {
  return isSignal<T>(v) ? v.value : v;
}

/**
 * Resolve open state for overlays: controlled boolean, Signal, or internal signal.
 * Subscribes so the host component re-renders on signal changes.
 * `setOpen` is stable across renders (useCallback).
 */
export function useOpenState(opts: {
  open?: MaybeSignal<boolean>;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}): {
  open: boolean;
  setOpen: (next: boolean) => void;
} {
  const internal = useMemo(() => signal(opts.defaultOpen ?? false), []);
  const externalSignal =
    opts.open !== undefined && isSignal(opts.open) ? (opts.open as Signal<boolean>) : null;
  const onOpenChangeRef = useRef(opts.onOpenChange);
  onOpenChangeRef.current = opts.onOpenChange;
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  useLayoutEffect(() => {
    if (opts.open !== undefined && !isSignal(opts.open)) {
      // controlled boolean — parent re-render supplies new open
      return;
    }
    const sig = externalSignal ?? internal;
    return sig.subscribe(() => {
      rerender(0);
    });
  }, [opts.open, externalSignal, internal]);

  const open =
    opts.open === undefined
      ? internal.value
      : externalSignal
        ? externalSignal.value
        : (opts.open as boolean);

  const setOpen = useCallback(
    (next: boolean) => {
      if (opts.open !== undefined && !isSignal(opts.open)) {
        onOpenChangeRef.current?.(next);
        return;
      }
      if (externalSignal) {
        externalSignal.value = next;
      } else {
        internal.value = next;
      }
      onOpenChangeRef.current?.(next);
      rerender(0);
    },
    [opts.open, externalSignal, internal],
  );

  return { open, setOpen };
}
