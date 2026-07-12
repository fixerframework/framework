import { describe, expect, it } from "vitest";
import { matchRoutes, paramsFromMatches } from "../src/core/match.ts";
import type { RouteDef } from "../src/core/types.ts";

const routes: RouteDef[] = [
  {
    path: "/",
    id: "root",
    children: [
      { index: true, path: "", id: "home" },
      {
        path: "blog",
        id: "blog",
        children: [
          { index: true, path: "", id: "blog-index" },
          { path: ":slug", id: "post" },
          { path: "about", id: "about" },
        ],
      },
      { path: "files/*path", id: "files" },
    ],
  },
];

describe("matchRoutes", () => {
  it("matches index at /", () => {
    const m = matchRoutes(routes, "/");
    expect(m).not.toBeNull();
    expect(m!.map((x) => x.id)).toEqual(["root", "home"]);
  });

  it("matches nested index", () => {
    const m = matchRoutes(routes, "/blog");
    expect(m!.map((x) => x.id)).toEqual(["root", "blog", "blog-index"]);
  });

  it("matches dynamic param", () => {
    const m = matchRoutes(routes, "/blog/hello");
    expect(m!.map((x) => x.id)).toEqual(["root", "blog", "post"]);
    expect(paramsFromMatches(m!)).toEqual({ slug: "hello" });
  });

  it("prefers static segment over dynamic", () => {
    const m = matchRoutes(routes, "/blog/about");
    expect(m!.map((x) => x.id)).toEqual(["root", "blog", "about"]);
  });

  it("matches splat", () => {
    const m = matchRoutes(routes, "/files/a/b/c");
    expect(m!.at(-1)!.id).toBe("files");
    expect(paramsFromMatches(m!)).toEqual({ path: "a/b/c" });
  });

  it("returns null for unknown path", () => {
    expect(matchRoutes(routes, "/nope")).toBeNull();
  });

  it("normalizes trailing slash", () => {
    const m = matchRoutes(routes, "/blog/");
    expect(m!.map((x) => x.id)).toEqual(["root", "blog", "blog-index"]);
  });

  it("returns null for malformed percent-encoding in params", () => {
    expect(matchRoutes([{ path: "/:id", id: "p" }], "/%E0%A4%A")).toBeNull();
  });
});
