import type { ComponentChild } from "preact";
import { render } from "preact";

export function mount(vnode: ComponentChild) {
  const el = document.createElement("div");
  document.body.appendChild(el);
  render(vnode, el);
  return el;
}

export function cleanup(el?: HTMLElement | null) {
  if (el) {
    render(null, el);
    el.remove();
  }
}

export async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((r) => setTimeout(r, 0));
}

export function deferred<T = void>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Wait until router status is ready or error (with timeout). */
export async function waitFor(
  predicate: () => boolean,
  timeoutMs = 1000,
): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("waitFor timeout");
    }
    await flush();
  }
}
