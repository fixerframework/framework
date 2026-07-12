import { signal } from "@preact/signals-core";
import { afterEach, describe, expect, it } from "vitest";
import { Show } from "../src/state/show.tsx";
import { cleanup, flush, mount } from "./helpers.ts";

afterEach(() => cleanup());

describe("Show", () => {
  it("renders children when when is truthy", () => {
    const el = mount(
      <Show when={true}>
        <span data-testid="ok">hello</span>
      </Show>,
    );
    expect(el.textContent).toBe("hello");
  });

  it("renders fallback when when is falsy", () => {
    const el = mount(
      <Show when={false} fallback={<span>empty</span>}>
        <span>hidden</span>
      </Show>,
    );
    expect(el.textContent).toBe("empty");
  });

  it("tracks a signal and re-renders", async () => {
    const open = signal(false);
    const el = mount(
      <Show when={open} fallback={<span>closed</span>}>
        <span>open</span>
      </Show>,
    );
    expect(el.textContent).toBe("closed");
    open.value = true;
    await flush();
    expect(el.textContent).toBe("open");
  });

  it("passes value to function children", () => {
    const el = mount(<Show when={"world" as string | false}>{(v) => <span>hi {v}</span>}</Show>);
    expect(el.textContent).toBe("hi world");
  });
});
