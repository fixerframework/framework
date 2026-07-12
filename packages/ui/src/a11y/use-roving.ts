import { useCallback, useState } from "preact/hooks";

export interface UseRovingOptions {
  count: number;
  orientation?: "horizontal" | "vertical";
  loop?: boolean;
  /** Controlled selected index. */
  index?: number;
  onIndexChange?: (index: number) => void;
}

/**
 * Roving tabindex index for tabs/listbox.
 * Returns active index + keyboard handler for arrow keys.
 */
export function useRoving({
  count,
  orientation = "horizontal",
  loop = true,
  index: controlled,
  onIndexChange,
}: UseRovingOptions) {
  const [uncontrolled, setUncontrolled] = useState(0);
  const index = controlled ?? uncontrolled;

  const setIndex = useCallback(
    (next: number) => {
      if (controlled === undefined) setUncontrolled(next);
      onIndexChange?.(next);
    },
    [controlled, onIndexChange],
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (count <= 0) return;
      const prevKey = orientation === "horizontal" ? "ArrowLeft" : "ArrowUp";
      const nextKey = orientation === "horizontal" ? "ArrowRight" : "ArrowDown";
      let next = index;
      if (e.key === nextKey) {
        e.preventDefault();
        next = index + 1;
        if (next >= count) next = loop ? 0 : count - 1;
      } else if (e.key === prevKey) {
        e.preventDefault();
        next = index - 1;
        if (next < 0) next = loop ? count - 1 : 0;
      } else if (e.key === "Home") {
        e.preventDefault();
        next = 0;
      } else if (e.key === "End") {
        e.preventDefault();
        next = count - 1;
      } else {
        return;
      }
      setIndex(next);
    },
    [count, index, loop, orientation, setIndex],
  );

  return { index, setIndex, onKeyDown };
}
