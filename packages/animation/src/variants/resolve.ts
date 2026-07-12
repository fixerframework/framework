import type { TargetAndTransition, Transition, Variant, Variants } from "../core/types.ts";

export function resolveVariant(
  definition: TargetAndTransition | string | false | undefined,
  variants?: Variants,
): Variant | undefined {
  if (definition === undefined || definition === false) return undefined;
  if (typeof definition === "string") {
    return variants?.[definition];
  }
  return definition;
}

export function mergeTransition(
  base?: Transition,
  override?: Transition,
): Transition | undefined {
  if (!base && !override) return undefined;
  return { ...base, ...override } as Transition;
}

/** Strip non-style keys from a variant for animate(). */
export function variantToTarget(variant: Variant): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(variant)) {
    if (k === "transition" || k === "transitionEnd") continue;
    if (typeof v === "number" || typeof v === "string") out[k] = v;
  }
  return out;
}
