import { describe, expect, it } from "vitest";
import { createBrowserHistory, createMemoryHistory } from "../src/core/history.ts";

describe("createMemoryHistory", () => {
  it("starts at initial path", () => {
    const h = createMemoryHistory({ initialPath: "/a" });
    expect(h.location.pathname).toBe("/a");
  });

  it("push and back", () => {
    const h = createMemoryHistory({ initialPath: "/" });
    const paths: string[] = [];
    h.listen((loc) => paths.push(loc.pathname));

    h.push({ pathname: "/one", search: "", hash: "", state: null });
    h.push({ pathname: "/two", search: "", hash: "", state: null });
    expect(h.location.pathname).toBe("/two");

    h.back();
    expect(h.location.pathname).toBe("/one");
    expect(paths).toEqual(["/one", "/two", "/one"]);
  });

  it("replace overwrites current entry", () => {
    const h = createMemoryHistory({ initialPath: "/" });
    h.push({ pathname: "/a", search: "", hash: "", state: null });
    h.replace({ pathname: "/b", search: "", hash: "", state: null });
    expect(h.location.pathname).toBe("/b");
    h.back();
    expect(h.location.pathname).toBe("/");
  });
});

describe("createBrowserHistory", () => {
  it("detaches popstate when last listener unsubscribes", () => {
    const h = createBrowserHistory();
    let fires = 0;
    const unsub = h.listen(() => {
      fires++;
    });
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(fires).toBe(1);
    unsub();
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(fires).toBe(1);
  });

  it("dispose removes popstate permanently", () => {
    const h = createBrowserHistory();
    let fires = 0;
    h.listen(() => {
      fires++;
    });
    h.dispose?.();
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(fires).toBe(0);
  });
});
