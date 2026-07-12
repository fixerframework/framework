import { useEffect, useMemo } from "preact/hooks";
import { motionValue, type MotionValue } from "../core/motion-value.ts";

/**
 * Map a MotionValue through a transform function.
 * Also supports input/output ranges: useTransform(mv, [0,1], [0,100]).
 */
export function useTransform(
  source: MotionValue,
  transformer: ((v: number) => number) | number[],
  outputRange?: number[],
): MotionValue {
  const out = useMemo(() => motionValue(0), []);

  useEffect(() => {
    const map =
      typeof transformer === "function"
        ? transformer
        : (v: number) => {
            const input = transformer;
            const output = outputRange ?? [0, 1];
            const i0 = input[0] ?? 0;
            const i1 = input[input.length - 1] ?? 1;
            const o0 = output[0] ?? 0;
            const o1 = output[output.length - 1] ?? 1;
            const t = i1 === i0 ? 0 : (v - i0) / (i1 - i0);
            const clamped = Math.min(1, Math.max(0, t));
            return o0 + (o1 - o0) * clamped;
          };

    const apply = (v: number) => out.set(map(v));
    apply(source.get());
    return source.on("change", apply);
  }, [source, transformer, outputRange]);

  return out;
}
