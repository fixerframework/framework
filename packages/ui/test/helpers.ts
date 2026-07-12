import type { ComponentChild } from "preact";
import { render } from "preact";

/** Mount a vnode into a fresh container on document.body. */
export function mount(vnode: ComponentChild) {
  const el = document.createElement("div");
  document.body.appendChild(el);
  render(vnode, el);
  return el;
}

/** Unmount and remove leftover portals. */
export function cleanup(el?: HTMLElement | null) {
  if (el) {
    render(null, el);
    el.remove();
  }
  // Drop portal content left on body
  for (const node of Array.from(document.body.children)) {
    if (node.getAttribute?.("data-ff-portal") != null) node.remove();
  }
  // Also clear any dialog/overlays from portals without marker
  for (const dialog of Array.from(document.querySelectorAll('[role="dialog"]'))) {
    dialog.remove();
  }
  for (const overlay of Array.from(document.querySelectorAll("[data-ff-dialog-overlay]"))) {
    const parent = overlay.parentElement;
    overlay.remove();
    // remove wrapper if empty-ish
    if (parent && parent !== document.body && parent.childElementCount === 0) {
      parent.remove();
    }
  }
}

/** Flush Preact's deferred state updates. */
export async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((r) => setTimeout(r, 0));
}
