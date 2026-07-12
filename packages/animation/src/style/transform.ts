import type { TransformKey } from "../core/types.ts";

export const TRANSFORM_KEYS: readonly TransformKey[] = [
  "x",
  "y",
  "z",
  "scale",
  "scaleX",
  "scaleY",
  "rotate",
  "rotateX",
  "rotateY",
  "skewX",
  "skewY",
  "transformOrigin",
] as const;

export const DEFAULT_TRANSFORM: Record<string, number> = {
  x: 0,
  y: 0,
  z: 0,
  scale: 1,
  scaleX: 1,
  scaleY: 1,
  rotate: 0,
  rotateX: 0,
  rotateY: 0,
  skewX: 0,
  skewY: 0,
};

export function isTransformKey(key: string): key is TransformKey {
  return (TRANSFORM_KEYS as readonly string[]).includes(key);
}

/** Build a CSS transform string from motion transform state. */
export function buildTransform(state: Record<string, number>): string {
  const x = state.x ?? 0;
  const y = state.y ?? 0;
  const z = state.z ?? 0;
  const scaleX = state.scaleX ?? state.scale ?? 1;
  const scaleY = state.scaleY ?? state.scale ?? 1;
  const rotate = state.rotate ?? 0;
  const rotateX = state.rotateX ?? 0;
  const rotateY = state.rotateY ?? 0;
  const skewX = state.skewX ?? 0;
  const skewY = state.skewY ?? 0;

  const parts: string[] = [];
  if (x || y || z) {
    parts.push(z ? `translate3d(${x}px, ${y}px, ${z}px)` : `translate(${x}px, ${y}px)`);
  }
  if (rotate) parts.push(`rotate(${rotate}deg)`);
  if (rotateX) parts.push(`rotateX(${rotateX}deg)`);
  if (rotateY) parts.push(`rotateY(${rotateY}deg)`);
  if (skewX) parts.push(`skewX(${skewX}deg)`);
  if (skewY) parts.push(`skewY(${skewY}deg)`);
  if (scaleX !== 1 || scaleY !== 1) {
    parts.push(scaleX === scaleY ? `scale(${scaleX})` : `scale(${scaleX}, ${scaleY})`);
  }
  return parts.length ? parts.join(" ") : "none";
}
