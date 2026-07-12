import { describe, it, expect } from "vitest";
import { shallowEqual, deepMerge } from "../index.ts";

describe("shallowEqual", () => {
  it("returns true for identical values", () => {
    expect(shallowEqual(1, 1)).toBe(true);
    expect(shallowEqual("a", "a")).toBe(true);
    expect(shallowEqual(null, null)).toBe(true);
  });

  it("returns true for objects with same keys and values", () => {
    expect(shallowEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
  });

  it("returns false for different values", () => {
    expect(shallowEqual({ a: 1 }, { a: 2 })).toBe(false);
  });

  it("returns false for different key counts", () => {
    expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it("uses Object.is for NaN", () => {
    expect(shallowEqual({ a: NaN }, { a: NaN })).toBe(true);
  });

  it("returns false when one side is not an object", () => {
    expect(shallowEqual({ a: 1 }, null)).toBe(false);
    expect(shallowEqual(null, { a: 1 })).toBe(false);
  });
});

describe("deepMerge", () => {
  it("merges nested plain objects", () => {
    const result = deepMerge(
      { a: { x: 1 }, b: 2 },
      { a: { y: 3 } },
    );
    expect(result).toEqual({ a: { x: 1, y: 3 }, b: 2 });
  });

  it("later sources override scalar conflicts", () => {
    const result = deepMerge({ a: 1 }, { a: 2 });
    expect(result.a).toBe(2);
  });

  it("replaces arrays instead of deep-merging", () => {
    const result = deepMerge({ a: [1, 2] }, { a: [3] });
    expect(result.a).toEqual([3]);
  });

  it("replaces class instances instead of deep-merging", () => {
    class Custom {}
    const instance = new Custom();
    const result = deepMerge({ a: instance }, { a: { x: 1 } });
    expect(result.a).toEqual({ x: 1 });
  });

  it("returns an empty object with no sources", () => {
    expect(deepMerge()).toEqual({});
  });

  it("ignores non-plain-object sources", () => {
    expect(deepMerge({ a: 1 }, null as never, undefined as never)).toEqual({ a: 1 });
  });
});
