import { useCallback, useRef } from "preact/hooks";
import { animate } from "../core/animate.ts";
import type { AnimateOptions } from "../core/animate.ts";
import type { Target } from "../core/types.ts";

/**
 * Returns [scopeRef, animate] where animate targets elements within scope (or the node itself).
 */
export function useAnimate<T extends HTMLElement = HTMLElement>(): [
  { current: T | null },
  (
    target: string | HTMLElement | Target,
    keyframes?: Target,
    options?: AnimateOptions,
  ) => ReturnType<typeof animate>,
] {
  const scope = useRef<T | null>(null);

  const animateFn = useCallback(
    (
      target: string | HTMLElement | Target,
      keyframes?: Target,
      options?: AnimateOptions,
    ) => {
      if (typeof target === "string") {
        const root = scope.current ?? document;
        const el =
          root instanceof HTMLElement
            ? root.querySelector<HTMLElement>(target) ?? root
            : document.querySelector<HTMLElement>(target);
        if (!el) {
          return {
            stop: () => {},
            finished: Promise.resolve(),
          };
        }
        return animate(el, keyframes ?? {}, options);
      }
      if (target instanceof HTMLElement) {
        return animate(target, keyframes ?? {}, options);
      }
      // animate scope element with target as keyframes
      const el = scope.current;
      if (!el) {
        return { stop: () => {}, finished: Promise.resolve() };
      }
      return animate(el, target as Target, keyframes as AnimateOptions | undefined);
    },
    [],
  );

  return [scope, animateFn];
}
