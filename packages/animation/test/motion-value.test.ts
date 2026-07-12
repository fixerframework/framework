import { afterEach, describe, expect, it } from "vitest";
import { __resetFrameClock } from "../src/core/driver.ts";
import { motionValue } from "../src/core/motion-value.ts";

afterEach(() => {
  __resetFrameClock();
});

describe("MotionValue", () => {
  it("stores and emits values", () => {
    const mv = motionValue(0);
    const seen: number[] = [];
    mv.on("change", (v) => seen.push(v));
    mv.set(10);
    expect(mv.get()).toBe(10);
    expect(seen).toEqual([10]);
  });

  it("jump zeros velocity", () => {
    const mv = motionValue(0);
    mv.set(5);
    mv.jump(100);
    expect(mv.get()).toBe(100);
    expect(mv.getVelocity()).toBe(0);
  });
});
