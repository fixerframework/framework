import { afterEach, describe, expect, it } from "vitest";
import { Popover } from "../src/primitives/popover.tsx";
import { cleanup, flush, mount } from "./helpers.ts";

afterEach(() => cleanup());

describe("Popover", () => {
  it("is closed by default", () => {
    mount(
      <Popover.Root>
        <Popover.Trigger>Open</Popover.Trigger>
        <Popover.Content>Panel</Popover.Content>
      </Popover.Root>,
    );
    expect(document.querySelector("[data-ff-popover]")).toBeNull();
  });

  it("opens and positions content fixed near trigger", async () => {
    const root = mount(
      <Popover.Root>
        <Popover.Trigger>Open</Popover.Trigger>
        <Popover.Content>Panel body</Popover.Content>
      </Popover.Root>,
    );
    root.querySelector("button")!.click();
    await flush();
    await flush();
    const panel = document.querySelector("[data-ff-popover]") as HTMLElement | null;
    expect(panel).not.toBeNull();
    expect(panel!.textContent).toContain("Panel body");
    expect(panel!.style.position).toBe("fixed");
    // top/left set after measure (may be 0 in headless — still must be set)
    expect(panel!.style.top).toMatch(/px$/);
    expect(panel!.style.left).toMatch(/px$/);
  });
});
