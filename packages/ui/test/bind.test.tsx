import { signal } from "@preact/signals-core";
import { afterEach, describe, expect, it } from "vitest";
import { Checkbox } from "../src/primitives/checkbox.tsx";
import { Input } from "../src/primitives/input.tsx";
import { bind, bindChecked } from "../src/state/bind.ts";
import { cleanup, mount } from "./helpers.ts";

afterEach(() => cleanup());

describe("bind", () => {
  it("binds string signal to input", () => {
    const name = signal("alice");
    const el = mount(<Input {...bind(name)} data-testid="input" />);
    const input = el.querySelector("input")!;
    expect(input.value).toBe("alice");

    input.value = "bob";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(name.value).toBe("bob");
  });

  it("bindChecked binds boolean signal", () => {
    const on = signal(false);
    const el = mount(<Checkbox {...bindChecked(on)} />);
    const box = el.querySelector("input")!;
    expect(box.checked).toBe(false);

    box.checked = true;
    box.dispatchEvent(new Event("change", { bubbles: true }));
    expect(on.value).toBe(true);
  });
});
