import { describe, it, expect } from "vitest";
import { isBrowser, isServer } from "../index.ts";

describe("env detection", () => {
  it("isBrowser and isServer are mutually exclusive", () => {
    expect(isBrowser).not.toBe(isServer);
  });

  it("in a Node test environment, isServer is true", () => {
    expect(isServer).toBe(true);
    expect(isBrowser).toBe(false);
  });
});
