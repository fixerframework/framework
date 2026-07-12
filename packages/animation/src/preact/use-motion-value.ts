import { useMemo } from "preact/hooks";
import { motionValue, type MotionValue } from "../core/motion-value.ts";

export function useMotionValue(init = 0): MotionValue {
  return useMemo(() => motionValue(init), []);
}
