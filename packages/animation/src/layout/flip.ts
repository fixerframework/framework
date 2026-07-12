import { animate } from "../core/animate.ts";
import type { Transition } from "../core/types.ts";
import { delta, measure, type Box } from "./measure.ts";

/**
 * FLIP: invert from previous box to current layout, then animate to identity.
 */
export function flip(
  el: HTMLElement,
  previous: Box,
  transition: Transition = { type: "spring", stiffness: 500, damping: 40 },
): ReturnType<typeof animate> {
  const next = measure(el);
  const d = delta(previous, next);

  // Invert
  el.style.transformOrigin = "top left";
  el.style.transform = `translate(${d.x}px, ${d.y}px) scale(${d.scaleX}, ${d.scaleY})`;

  // Snapshot for animate pipeline
  (el as HTMLElement & { __ffStyle?: Record<string, number | string> }).__ffStyle = {
    x: d.x,
    y: d.y,
    scaleX: d.scaleX,
    scaleY: d.scaleY,
    opacity: 1,
  };

  return animate(
    el,
    { x: 0, y: 0, scaleX: 1, scaleY: 1 },
    transition,
  );
}
