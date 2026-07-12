import { describe, expect, it } from "vitest";
import { cn } from "../src/lib/cn.ts";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1");
  });

  it("resolves tailwind conflicts (last wins)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("handles conditionals", () => {
    const off = false;
    const on = true;
    expect(cn("base", off && "no", on && "yes")).toBe("base yes");
  });
});
