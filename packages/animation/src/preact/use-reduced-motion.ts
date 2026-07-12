import { useEffect, useState } from "preact/hooks";
import { prefersReducedMotion } from "../core/reduced-motion.ts";
import { useMotionConfig } from "./motion-config.tsx";
import { shouldReduceMotion } from "../core/reduced-motion.ts";

export function useReducedMotion(): boolean {
  const config = useMotionConfig();
  const [reduce, setReduce] = useState(() => shouldReduceMotion(config.reducedMotion));

  useEffect(() => {
    setReduce(shouldReduceMotion(config.reducedMotion));
    if (config.reducedMotion !== "user" || typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduce(prefersReducedMotion());
    mql.addEventListener?.("change", onChange);
    return () => mql.removeEventListener?.("change", onChange);
  }, [config.reducedMotion]);

  return reduce;
}
