import { buildTransform, isTransformKey } from "./transform.ts";

export type StyleBag = Record<string, number | string>;

/**
 * Apply a flat style bag to an element, composing transform channels.
 */
export function applyStyle(el: HTMLElement, bag: StyleBag): void {
  const transformState: Record<string, number> = {};
  let hasTransform = false;
  let origin: string | undefined;

  for (const [key, value] of Object.entries(bag)) {
    if (key === "transformOrigin") {
      origin = String(value);
      continue;
    }
    if (isTransformKey(key)) {
      transformState[key] = typeof value === "number" ? value : Number(value) || 0;
      hasTransform = true;
      continue;
    }
    if (key === "opacity") {
      el.style.opacity = String(value);
      continue;
    }
    // generic CSS
    try {
      (el.style as unknown as Record<string, string>)[key] = String(value);
    } catch {
      el.style.setProperty(key, String(value));
    }
  }

  if (hasTransform) {
    el.style.transform = buildTransform(transformState);
  }
  if (origin != null) {
    el.style.transformOrigin = origin;
  }
}

/** Merge transform keys from multiple bags (later wins). */
export function mergeStyleBags(...bags: StyleBag[]): StyleBag {
  const out: StyleBag = {};
  for (const bag of bags) {
    Object.assign(out, bag);
  }
  return out;
}
