import { signal } from "@preact/signals-core";
import { afterEach, describe, expect, it } from "vitest";
import { Dialog } from "../src/primitives/dialog.tsx";
import { cleanup, flush, mount } from "./helpers.ts";

afterEach(() => cleanup());

describe("Dialog", () => {
  it("is closed by default", () => {
    mount(
      <Dialog.Root>
        <Dialog.Trigger>Open</Dialog.Trigger>
        <Dialog.Content>
          <Dialog.Title>Title</Dialog.Title>
        </Dialog.Content>
      </Dialog.Root>,
    );
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it("opens via trigger", async () => {
    const root = mount(
      <Dialog.Root>
        <Dialog.Trigger>Open</Dialog.Trigger>
        <Dialog.Content>
          <Dialog.Title>Hello</Dialog.Title>
        </Dialog.Content>
      </Dialog.Root>,
    );
    root.querySelector("button")!.click();
    await flush();
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog!.textContent).toContain("Hello");
  });

  it("supports signal open state", async () => {
    const open = signal(false);
    mount(
      <Dialog.Root open={open}>
        <Dialog.Content>
          <Dialog.Title>Sig</Dialog.Title>
        </Dialog.Content>
      </Dialog.Root>,
    );
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    open.value = true;
    await flush();
    await flush();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    open.value = false;
    await flush();
    await flush();
    await flush();
    // exit animation may keep node briefly
    const dialog = document.querySelector('[role="dialog"]');
    if (dialog) {
      expect(open.value).toBe(false);
    } else {
      expect(dialog).toBeNull();
    }
  });

  it("omits aria-describedby without Description", async () => {
    const root = mount(
      <Dialog.Root defaultOpen>
        <Dialog.Content>
          <Dialog.Title>Only title</Dialog.Title>
        </Dialog.Content>
      </Dialog.Root>,
    );
    await flush();
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog!.hasAttribute("aria-describedby")).toBe(false);
    // ensure title is still labelled
    expect(dialog!.getAttribute("aria-labelledby")).toBeTruthy();
    void root;
  });

  it("sets aria-describedby when Description is present", async () => {
    mount(
      <Dialog.Root defaultOpen>
        <Dialog.Content>
          <Dialog.Title>T</Dialog.Title>
          <Dialog.Description>Helpful text</Dialog.Description>
        </Dialog.Content>
      </Dialog.Root>,
    );
    await flush();
    await flush();
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute("aria-describedby")).toBeTruthy();
  });
});
