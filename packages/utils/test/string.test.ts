import { describe, it, expect } from "vitest";
import { stableStringify } from "../index.ts";

describe("stableStringify", () => {
  it("serializes primitives", () => {
    expect(stableStringify(null)).toBe("null");
    expect(stableStringify(undefined)).toBe("undefined");
    expect(stableStringify("hello")).toBe('"hello"');
    expect(stableStringify(42)).toBe("42");
    expect(stableStringify(true)).toBe("true");
  });

  it("serializes bigint with a tag", () => {
    expect(stableStringify(42n)).toBe('{"$bigint":"42"}');
  });

  it("serializes arrays element-by-element", () => {
    expect(stableStringify([1, "two", false])).toBe('[1,"two",false]');
    expect(stableStringify([])).toBe("[]");
  });

  it("serializes nested arrays", () => {
    expect(stableStringify([[1, 2], [3]])).toBe("[[1,2],[3]]");
  });

  it("sorts object keys deterministically", () => {
    const a = stableStringify({ b: 2, a: 1 });
    const b = stableStringify({ a: 1, b: 2 });
    expect(a).toBe(b);
    expect(a).toBe('{"a":1,"b":2}');
  });

  it("serializes Dates with a tag", () => {
    const d = new Date("2026-01-15T00:00:00.000Z");
    expect(stableStringify(d)).toBe('{"$date":"2026-01-15T00:00:00.000Z"}');
  });

  it("handles nested objects with sorted keys", () => {
    const result = stableStringify({ z: { y: 1, x: 2 }, a: 0 });
    expect(result).toBe('{"a":0,"z":{"x":2,"y":1}}');
  });

  it("throws for functions", () => {
    expect(() => stableStringify(() => {})).toThrow(TypeError);
  });

  it("throws for symbols", () => {
    expect(() => stableStringify(Symbol("x"))).toThrow(TypeError);
  });
});
