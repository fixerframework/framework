import { afterEach, describe, expect, it } from "vitest";
import { bindDrag } from "../src/gestures/drag.ts";
import { cleanup } from "./helpers.ts";

afterEach(() => cleanup());

describe("bindDrag", () => {
  it("updates offset on pointer move", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    let offset = { x: 0, y: 0 };
    const drag = bindDrag(el, {
      axis: true,
      getOffset: () => offset,
      setOffset: (x, y) => {
        offset = { x, y };
      },
    });

    el.dispatchEvent(
      new PointerEvent("pointerdown", { clientX: 10, clientY: 10, button: 0, bubbles: true }),
    );
    window.dispatchEvent(
      new PointerEvent("pointermove", { clientX: 40, clientY: 25, bubbles: true }),
    );
    expect(offset.x).toBe(30);
    expect(offset.y).toBe(15);

    window.dispatchEvent(new PointerEvent("pointerup", { clientX: 40, clientY: 25, bubbles: true }));
    drag.destroy();
    el.remove();
  });

  it("locks to x axis", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    let offset = { x: 0, y: 0 };
    const drag = bindDrag(el, {
      axis: "x",
      getOffset: () => offset,
      setOffset: (x, y) => {
        offset = { x, y };
      },
    });
    el.dispatchEvent(
      new PointerEvent("pointerdown", { clientX: 0, clientY: 0, button: 0, bubbles: true }),
    );
    window.dispatchEvent(
      new PointerEvent("pointermove", { clientX: 20, clientY: 50, bubbles: true }),
    );
    expect(offset.x).toBe(20);
    expect(offset.y).toBe(0);
    drag.destroy();
    el.remove();
  });
});
