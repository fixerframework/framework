import { createMotionComponent, type MotionComponent } from "./motion.tsx";

const cache = new Map<string, MotionComponent>();

function get(tag: string): MotionComponent {
  let c = cache.get(tag);
  if (!c) {
    c = createMotionComponent(tag);
    cache.set(tag, c);
  }
  return c;
}

/** `motion.div`, `motion.span`, … — every HTML tag is a motion component. */
export type MotionHTML = {
  [K in keyof HTMLElementTagNameMap]: MotionComponent;
};

/**
 * Proxy factory: `motion.div`, `motion.span`, `motion.button`, …
 */
export const motion: MotionHTML = new Proxy({} as MotionHTML, {
  get(_target, prop: string | symbol) {
    if (typeof prop !== "string") return undefined;
    return get(prop);
  },
}) as MotionHTML;
