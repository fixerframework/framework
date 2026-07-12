import { useEffect, useMemo } from "preact/hooks";
import { animateValue } from "../core/animate.ts";
import { motionValue, type MotionValue } from "../core/motion-value.ts";
import type { SpringTransition } from "../core/types.ts";
import { useMotionConfig } from "./motion-config.tsx";

/**
 * Returns a MotionValue that springs toward `source` (number or MotionValue).
 */
export function useSpring(
  source: number | MotionValue,
  config: Omit<SpringTransition, "type"> = {},
): MotionValue {
  const out = useMemo(() => motionValue(typeof source === "number" ? source : source.get()), []);
  const motionConfig = useMotionConfig();

  useEffect(() => {
    const unsubs: Array<() => void> = [];
    const run = (v: number) => {
      animateValue(
        out,
        v,
        { type: "spring", stiffness: 300, damping: 30, ...config },
        { reducedMotion: motionConfig.reducedMotion },
      );
    };

    if (typeof source === "number") {
      run(source);
    } else {
      run(source.get());
      unsubs.push(source.on("change", run));
    }
    return () => {
      for (const u of unsubs) u();
    };
  }, [source, config.stiffness, config.damping, config.mass, motionConfig.reducedMotion]);

  return out;
}
