import { describe, expect, it } from "vitest";
import { createMemoryHistory } from "../src/core/history.ts";

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
