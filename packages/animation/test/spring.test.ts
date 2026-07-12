import { describe, expect, it } from "vitest";
import { createSpring } from "../src/core/spring.ts";

describe("createSpring", () => {
  it("settles at target", () => {
    const spring = createSpring({ stiffness: 300, damping: 30 });
    let pos = 0;
    let done = false;
    for (let i = 0; i < 500 && !done; i++) {
      const s = spring.step(pos, 100, 16);
      pos = s.position;
      done = s.done;
    }
    expect(done).toBe(true);
    expect(pos).toBeCloseTo(100, 1);
  });
});
