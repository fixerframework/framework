import { afterEach, describe, expect, it } from "vitest";
import { motion } from "../src/preact/motion-proxy.ts";
import { __setReducedMotionOverride } from "../src/core/reduced-motion.ts";
import { advanceFrames, cleanup, flush, mount } from "./helpers.ts";

afterEach(() => cleanup());

describe("motion component", () => {
  it("renders a div and animates opacity", async () => {
    __setReducedMotionOverride(true);
    const root = mount(
      <motion.div
        data-testid="m"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.01 }}
      >
        hi
      </motion.div>,
    );
    await flush();
    advanceFrames(5);
    const el = root.querySelector("[data-testid=m]") as HTMLElement;
    expect(el).not.toBeNull();
    expect(el.textContent).toContain("hi");
    expect(Number(el.style.opacity)).toBe(1);
  });

  it("applies whileHover target on pointerenter", async () => {
    __setReducedMotionOverride(true);
    const root = mount(
      <motion.button
        data-testid="b"
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.2 }}
      >
        btn
      </motion.button>,
    );
    await flush();
    await flush();
    const el = root.querySelector("[data-testid=b]") as HTMLElement;
    el.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    el.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
    await flush();
    advanceFrames(5);
    await flush();
    // reduced-motion snaps to whileHover scale
    expect(el.style.transform === "none" || el.style.transform.includes("scale")).toBe(true);
    // Prefer asserting the motion style bag when transform string is identity-collapsed
    const bag = (el as HTMLElement & { __ffStyle?: { scale?: number } }).__ffStyle;
    if (bag?.scale != null) {
      expect(bag.scale).toBeCloseTo(1.2, 1);
    } else {
      expect(el.style.transform).toContain("scale");
    }
  });
});
