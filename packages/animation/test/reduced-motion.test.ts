import { afterEach, describe, expect, it } from "vitest";
import {
  __setReducedMotionOverride,
  shouldReduceMotion,
} from "../src/core/reduced-motion.ts";
import { cleanup } from "./helpers.ts";

afterEach(() => cleanup());

describe("reduced motion", () => {
  it("honors always/never/user override", () => {
    __setReducedMotionOverride(true);
    expect(shouldReduceMotion("user")).toBe(true);
    expect(shouldReduceMotion("never")).toBe(false);
    expect(shouldReduceMotion("always")).toBe(true);
    __setReducedMotionOverride(false);
    expect(shouldReduceMotion("user")).toBe(false);
  });
});
