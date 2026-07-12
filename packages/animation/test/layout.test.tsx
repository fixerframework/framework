import { afterEach, describe, expect, it } from "vitest";
import { flip } from "../src/layout/flip.ts";
import { measure } from "../src/layout/measure.ts";
import { advanceFrames, cleanup } from "./helpers.ts";
import { __setReducedMotionOverride } from "../src/core/reduced-motion.ts";

afterEach(() => cleanup());

describe("layout FLIP", () => {
  it("animates from previous box toward identity", async () => {
    __setReducedMotionOverride(false);
    const el = document.createElement("div");
    el.style.position = "fixed";
    el.style.left = "0px";
    el.style.top = "0px";
    el.style.width = "100px";
    el.style.height = "40px";
    document.body.appendChild(el);

    const prev = measure(el);
    el.style.left = "80px";
    el.style.top = "40px";
    // force layout
    void el.offsetWidth;

    const controls = flip(el, prev, { type: "tween", duration: 0.05 });
    expect(el.style.transform).not.toBe("none");
    advanceFrames(40);
    await controls.finished;
    // settled near identity
    const t = el.style.transform;
    expect(t === "none" || t.includes("translate(0px") || t.includes("0px, 0px")).toBe(true);
    el.remove();
  });
});
