import { useEffect, useRef } from "preact/hooks";

export interface UseDismissOptions {
  open: boolean;
  onDismiss: () => void;
  /** Element that owns the overlay (for outside-click). */
  rootRef?: { current: HTMLElement | null };
  /** Close on Escape (default true). */
  escape?: boolean;
  /** Close on pointer down outside root (default true). */
  outside?: boolean;
}

/** Escape + optional outside-click dismiss for overlays. */
export function useDismiss({
  open,
  onDismiss,
  rootRef,
  escape = true,
  outside = true,
}: UseDismissOptions): void {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (escape && e.key === "Escape") {
        e.stopPropagation();
        onDismissRef.current();
      }
    };

    const onPointer = (e: PointerEvent) => {
      if (!outside || !rootRef?.current) return;
      const target = e.target as Node | null;
      if (target && !rootRef.current.contains(target)) {
        onDismissRef.current();
      }
    };

    document.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", onPointer, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onPointer, true);
    };
  }, [open, rootRef, escape, outside]);
}
