import { afterEach, describe, expect, it } from "vitest";
import { Button } from "../src/primitives/button.tsx";
import { cleanup, mount } from "./helpers.ts";

afterEach(() => cleanup());

describe("Button", () => {
  it("renders children", () => {
    const el = mount(<Button>Click</Button>);
    expect(el.textContent).toBe("Click");
  });

  it("applies variant classes", () => {
    const el = mount(<Button variant="destructive">Del</Button>);
    const btn = el.querySelector("button")!;
    expect(btn.className).toContain("bg-destructive");
  });

  it("loading disables and sets aria-busy", () => {
    const el = mount(<Button loading>Save</Button>);
    const btn = el.querySelector("button")!;
    expect(btn.disabled).toBe(true);
    expect(btn.getAttribute("aria-busy")).toBe("true");
  });
});
