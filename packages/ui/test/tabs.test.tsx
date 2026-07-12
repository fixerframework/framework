import { afterEach, describe, expect, it } from "vitest";
import { Tabs } from "../src/primitives/tabs.tsx";
import { cleanup, flush, mount } from "./helpers.ts";

afterEach(() => cleanup());

describe("Tabs", () => {
  it("wires aria-controls between trigger and panel", async () => {
    const root = mount(
      <Tabs.Root defaultValue="one">
        <Tabs.List>
          <Tabs.Trigger value="one">One</Tabs.Trigger>
          <Tabs.Trigger value="two">Two</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="one">Panel 1</Tabs.Content>
        <Tabs.Content value="two">Panel 2</Tabs.Content>
      </Tabs.Root>,
    );
    await flush();

    const tabs = root.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBe(2);
    const first = tabs[0] as HTMLButtonElement;
    expect(first.getAttribute("aria-selected")).toBe("true");
    const panelId = first.getAttribute("aria-controls");
    expect(panelId).toBeTruthy();
    const panel = root.querySelector(`#${CSS.escape(panelId!)}`);
    expect(panel?.getAttribute("role")).toBe("tabpanel");
    expect(panel?.textContent).toContain("Panel 1");
  });

  it("switches panels on trigger click", async () => {
    const root = mount(
      <Tabs.Root defaultValue="one">
        <Tabs.List>
          <Tabs.Trigger value="one">One</Tabs.Trigger>
          <Tabs.Trigger value="two">Two</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="one">Panel 1</Tabs.Content>
        <Tabs.Content value="two">Panel 2</Tabs.Content>
      </Tabs.Root>,
    );
    await flush();
    (root.querySelectorAll('[role="tab"]')[1] as HTMLButtonElement).click();
    await flush();
    expect(root.textContent).toContain("Panel 2");
    expect(root.textContent).not.toContain("Panel 1");
  });
});
