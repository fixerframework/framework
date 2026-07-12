import { describe, expect, it } from "vitest";
import { createState } from "../src/create-state.ts";

describe("atom", () => {
  it("reads and writes .value", () => {
    const state = createState();
    const count = state.atom(0);
    expect(count.value).toBe(0);
    count.value = 3;
    expect(count.value).toBe(3);
  });

  it("registers by explicit id and reuses the same signal", () => {
    const state = createState();
    const a = state.atom({ open: false }, { id: "sidebar" });
    const b = state.atom({ open: true }, { id: "sidebar" });
    expect(a).toBe(b);
    expect(a.value.open).toBe(false);
    a.value = { open: true };
    expect(b.value.open).toBe(true);
  });

  it("derive tracks atom dependencies", () => {
    const state = createState();
    const n = state.atom(1);
    const doubled = state.derive(() => n.value * 2);
    expect(doubled.value).toBe(2);
    n.value = 5;
    expect(doubled.value).toBe(10);
  });
});
