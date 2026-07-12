import { afterEach, describe, expect, it } from "vitest";
import { createScrollMotionValues } from "../src/scroll/scroll.ts";
import { cleanup } from "./helpers.ts";

afterEach(() => cleanup());

describe("createScrollMotionValues", () => {
  it("reads window scroll progress", () => {
    const values = createScrollMotionValues();
    expect(values.scrollY.get()).toBeTypeOf("number");
    expect(values.scrollYProgress.get()).toBeGreaterThanOrEqual(0);
    expect(values.scrollYProgress.get()).toBeLessThanOrEqual(1);
    values.destroy();
  });
});
