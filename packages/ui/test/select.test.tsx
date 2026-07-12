import { afterEach, describe, expect, it } from "vitest";
import { Select } from "../src/primitives/select.tsx";
import { cleanup, flush, mount } from "./helpers.ts";

afterEach(() => cleanup());

describe("Select", () => {
  it("opens listbox and selects an item showing its label", async () => {
    const root = mount(
      <Select.Root>
        <Select.Trigger placeholder="Pick" />
        <Select.Content>
          <Select.Item value="a">Alpha</Select.Item>
          <Select.Item value="b">Beta</Select.Item>
        </Select.Content>
      </Select.Root>,
    );

    const trigger = root.querySelector('[role="combobox"]') as HTMLButtonElement;
    expect(trigger.textContent).toContain("Pick");
    trigger.click();
    await flush();

    const options = document.querySelectorAll('[role="option"]');
    expect(options.length).toBe(2);
    (options[1] as HTMLButtonElement).click();
    await flush();

    expect(document.querySelector('[role="listbox"]')).toBeNull();
    expect(trigger.textContent).toContain("Beta");
  });

  it("supports arrow keys on open listbox", async () => {
    const root = mount(
      <Select.Root defaultValue="a">
        <Select.Trigger />
        <Select.Content>
          <Select.Item value="a">Alpha</Select.Item>
          <Select.Item value="b">Beta</Select.Item>
        </Select.Content>
      </Select.Root>,
    );
    const trigger = root.querySelector('[role="combobox"]') as HTMLButtonElement;
    trigger.click();
    await flush();

    const listbox = document.querySelector('[role="listbox"]') as HTMLElement;
    listbox.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    await flush();
    listbox.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await flush();

    expect(trigger.textContent).toContain("Beta");
  });
});
