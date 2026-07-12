const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function getFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute("disabled") && el.offsetParent !== null,
  );
}

/** Trap Tab/Shift+Tab focus inside `root`. Returns cleanup. */
export function trapFocus(root: HTMLElement): () => void {
  const previouslyFocused = document.activeElement as HTMLElement | null;

  const focusFirst = () => {
    const items = getFocusable(root);
    (items[0] ?? root).focus();
  };

  // Defer so content is mounted
  queueMicrotask(focusFirst);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const items = getFocusable(root);
    if (items.length === 0) {
      e.preventDefault();
      root.focus();
      return;
    }
    const first = items[0]!;
    const last = items[items.length - 1]!;
    if (e.shiftKey) {
      if (document.activeElement === first || document.activeElement === root) {
        e.preventDefault();
        last.focus();
      }
    } else if (document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  root.addEventListener("keydown", onKeyDown);
  return () => {
    root.removeEventListener("keydown", onKeyDown);
    previouslyFocused?.focus?.();
  };
}
