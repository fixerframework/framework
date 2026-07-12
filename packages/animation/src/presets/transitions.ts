import type { SpringTransition, TweenTransition } from "../core/types.ts";
import { stagger as staggerFn } from "../variants/stagger.ts";

export function spring(opts: Omit<SpringTransition, "type"> = {}): SpringTransition {
  return { type: "spring", stiffness: 300, damping: 30, ...opts };
}

export function tween(opts: Omit<TweenTransition, "type"> = {}): TweenTransition {
  return { type: "tween", duration: 0.3, ease: "easeInOut", ...opts };
}

export { staggerFn as stagger };
