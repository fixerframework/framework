import type { ComponentChild } from "preact";
import { render } from "preact";
import { __resetFrameClock, frame } from "../src/core/driver.ts";
import { __setReducedMotionOverride } from "../src/core/reduced-motion.ts";

/** Mount a vnode into a fresh container on document.body. */
export function mount(vnode: ComponentChild) {
  const el = document.createElement("div");
  document.body.appendChild(el);
  render(vnode, el);
  return el;
}

export function cleanup(el?: HTMLElement | null) {
  if (el) {
    render(null, el);
    el.remove();
  }
  __resetFrameClock();
  __setReducedMotionOverride(null);
}

export async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((r) => setTimeout(r, 0));
}

/** Advance the animation driver by n frames. */
export function advanceFrames(n: number, deltaMs = 16.67): void {
  for (let i = 0; i < n; i++) {
    frame.__step(deltaMs);
  }
}
