import { useEffect, useMemo } from "preact/hooks";
import { motionValue, type MotionValue } from "../core/motion-value.ts";

/** MotionValue of the velocity of `source`. */
export function useVelocity(source: MotionValue): MotionValue {
  const out = useMemo(() => motionValue(0), []);
  useEffect(() => {
    const apply = () => out.set(source.getVelocity());
    apply();
    return source.on("change", apply);
  }, [source]);
  return out;
}
