import { motionValue, type MotionValue } from "../core/motion-value.ts";

export interface UseScrollOptions {
  /** Element to track; defaults to document scrolling element / window. */
  target?: { current: HTMLElement | null } | HTMLElement | null;
  offset?: [string, string];
  container?: { current: HTMLElement | null } | HTMLElement | null;
  axis?: "x" | "y";
}

export interface ScrollMotionValues {
  scrollX: MotionValue;
  scrollY: MotionValue;
  scrollXProgress: MotionValue;
  scrollYProgress: MotionValue;
  destroy: () => void;
}

function resolveEl(
  ref: { current: HTMLElement | null } | HTMLElement | null | undefined,
): HTMLElement | null {
  if (!ref) return null;
  if (typeof (ref as { current?: unknown }).current !== "undefined") {
    return (ref as { current: HTMLElement | null }).current;
  }
  return ref as HTMLElement;
}

/**
 * Create scroll-linked motion values. Call destroy on unmount.
 */
export function createScrollMotionValues(options: UseScrollOptions = {}): ScrollMotionValues {
  const scrollX = motionValue(0);
  const scrollY = motionValue(0);
  const scrollXProgress = motionValue(0);
  const scrollYProgress = motionValue(0);

  const update = () => {
    const container = resolveEl(options.container);
    const target = resolveEl(options.target);

    if (container) {
      const maxX = container.scrollWidth - container.clientWidth;
      const maxY = container.scrollHeight - container.clientHeight;
      scrollX.set(container.scrollLeft);
      scrollY.set(container.scrollTop);
      scrollXProgress.set(maxX <= 0 ? 0 : container.scrollLeft / maxX);
      scrollYProgress.set(maxY <= 0 ? 0 : container.scrollTop / maxY);
      return;
    }

    if (target) {
      const rect = target.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const vw = window.innerWidth || 1;
      // Progress of target through viewport (0 when bottom hits bottom… simplified)
      const yProg = 1 - Math.min(1, Math.max(0, rect.top / vh));
      const xProg = 1 - Math.min(1, Math.max(0, rect.left / vw));
      scrollY.set(window.scrollY + rect.top);
      scrollX.set(window.scrollX + rect.left);
      scrollYProgress.set(yProg);
      scrollXProgress.set(xProg);
      return;
    }

    const se = document.scrollingElement ?? document.documentElement;
    const maxX = se.scrollWidth - se.clientWidth;
    const maxY = se.scrollHeight - se.clientHeight;
    const x = window.scrollX ?? se.scrollLeft;
    const y = window.scrollY ?? se.scrollTop;
    scrollX.set(x);
    scrollY.set(y);
    scrollXProgress.set(maxX <= 0 ? 0 : x / maxX);
    scrollYProgress.set(maxY <= 0 ? 0 : y / maxY);
  };

  update();

  const container = resolveEl(options.container);
  const scrollTarget: EventTarget = container ?? window;
  scrollTarget.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);

  return {
    scrollX,
    scrollY,
    scrollXProgress,
    scrollYProgress,
    destroy: () => {
      scrollTarget.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      scrollX.destroy();
      scrollY.destroy();
      scrollXProgress.destroy();
      scrollYProgress.destroy();
    },
  };
}
