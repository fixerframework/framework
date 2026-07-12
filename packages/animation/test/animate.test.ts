import { afterEach, describe, expect, it } from "vitest";
import { animate, animateValue } from "../src/core/animate.ts";
import { __resetFrameClock } from "../src/core/driver.ts";
import { motionValue } from "../src/core/motion-value.ts";
import { __setReducedMotionOverride } from "../src/core/reduced-motion.ts";
import { advanceFrames, cleanup } from "./helpers.ts";

afterEach(() => cleanup());

describe("animateValue", () => {
  it("springs a motion value to target", async () => {
    const mv = motionValue(0);
    const controls = animateValue(mv, 100, { type: "spring", stiffness: 400, damping: 30 });
    advanceFrames(120);
    await controls.finished;
    expect(mv.get()).toBeCloseTo(100, 0);
  });

  it("tweens with duration", async () => {
    const mv = motionValue(0);
    const controls = animateValue(mv, 50, { type: "tween", duration: 0.1, ease: "linear" });
    advanceFrames(10, 16);
    await controls.finished;
    expect(mv.get()).toBeCloseTo(50, 0);
  });

  it("respects reduced motion", async () => {
    __setReducedMotionOverride(true);
    const mv = motionValue(0);
    const controls = animateValue(mv, 99, { type: "spring" });
    await controls.finished;
    expect(mv.get()).toBe(99);
  });
});

describe("animate element", () => {
  it("sets opacity on element", async () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    el.style.opacity = "0";
    const controls = animate(el, { opacity: 1 }, { type: "tween", duration: 0.05, ease: "linear" });
    advanceFrames(20);
    await controls.finished;
    expect(Number(el.style.opacity)).toBeCloseTo(1, 1);
    el.remove();
  });

  it("composes transform translate", async () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const controls = animate(el, { x: 40, y: 10 }, { type: "tween", duration: 0.05 });
    advanceFrames(20);
    await controls.finished;
    expect(el.style.transform).toContain("translate");
    el.remove();
  });
});
