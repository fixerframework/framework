import type { ReducedMotionSetting } from "./types.ts";

let override: boolean | null = null;

/** Test helper. Pass null to clear. */
export function __setReducedMotionOverride(value: boolean | null): void {
  override = value;
}

export function prefersReducedMotion(): boolean {
  if (override != null) return override;
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function shouldReduceMotion(setting: ReducedMotionSetting = "user"): boolean {
  if (setting === "always") return true;
  if (setting === "never") return false;
  return prefersReducedMotion();
}
