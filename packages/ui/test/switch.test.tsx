import { afterEach, describe, expect, it } from "vitest";
import { Switch } from "../src/primitives/switch.tsx";
import { cleanup, flush, mount } from "./helpers.ts";

afterEach(() => cleanup());

describe("Switch", () => {
  it("updates visuals when uncontrolled", async () => {
    const el = mount(<Switch defaultChecked={false} />);
    const input = el.querySelector('input[role="switch"]') as HTMLInputElement;
    const thumb = el.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(input.checked).toBe(false);
    expect(thumb.className).toContain("translate-x-0.5");

    input.checked = true;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await flush();
    expect(thumb.className).toContain("translate-x-4");
  });
});
