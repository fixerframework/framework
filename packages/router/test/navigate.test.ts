import { describe, expect, it } from "vitest";
import { createRouter } from "../src/core/create-router.ts";
import type { RouteDef } from "../src/core/types.ts";
import { flush, waitFor } from "./helpers.ts";

const routes: RouteDef[] = [
  {
    path: "/",
    id: "root",
    children: [
      { index: true, path: "", id: "home" },
      { path: "about", id: "about" },
      { path: "users/:id", id: "user" },
    ],
  },
];

describe("createRouter navigate", () => {
  it("matches initial path and updates on navigate", async () => {
    const router = createRouter({
      routes,
      history: "memory",
      initialPath: "/",
    });
    const stop = router.start();
    await waitFor(() => router.status.value === "ready");
    expect(router.location.value.pathname).toBe("/");
    expect(router.matches.value.map((m) => m.id)).toEqual(["root", "home"]);

    router.navigate("/about");
    await waitFor(() => router.location.value.pathname === "/about");
    expect(router.matches.value.map((m) => m.id)).toEqual(["root", "about"]);
    expect(router.status.value).toBe("ready");

    router.navigate("/users/42");
    await waitFor(() => router.location.value.pathname === "/users/42");
    expect(router.params.value).toEqual({ id: "42" });

    stop();
  });

  it("replace does not grow stack oddly — back goes to prior", async () => {
    const router = createRouter({
      routes,
      history: "memory",
      initialPath: "/",
    });
    const stop = router.start();
    await waitFor(() => router.status.value === "ready");

    router.navigate("/about");
    await waitFor(() => router.location.value.pathname === "/about");

    router.navigate("/users/1", { replace: true });
    await waitFor(() => router.location.value.pathname === "/users/1");

    router.back();
    await flush();
    await waitFor(() => router.location.value.pathname === "/");
    stop();
  });

  it("sets error on unknown route", async () => {
    const router = createRouter({
      routes,
      history: "memory",
      initialPath: "/",
    });
    const stop = router.start();
    await waitFor(() => router.status.value === "ready");

    router.navigate("/missing");
    await waitFor(() => router.status.value === "error");
    expect(String(router.error.value)).toMatch(/No route matched/);
    stop();
  });

  it("applies base to history while location stays app-absolute", async () => {
    const router = createRouter({
      routes,
      history: "memory",
      initialPath: "/about",
      base: "/app",
    });
    const stop = router.start();
    await waitFor(() => router.status.value === "ready");
    expect(router.location.value.pathname).toBe("/about");
    expect(router.__history.location.pathname).toBe("/app/about");
    expect(router.base).toBe("/app");

    router.navigate("/users/1");
    await waitFor(() => router.location.value.pathname === "/users/1");
    expect(router.__history.location.pathname).toBe("/app/users/1");
    stop();
  });

  it("resolves relative navigate with URL rules", async () => {
    const nested: RouteDef[] = [
      {
        path: "/",
        id: "root",
        children: [
          {
            path: "blog",
            id: "blog",
            children: [
              { index: true, path: "", id: "blog-index" },
              { path: "post", id: "post" },
            ],
          },
          { path: "post", id: "root-post" },
        ],
      },
    ];
    const router = createRouter({
      routes: nested,
      history: "memory",
      initialPath: "/blog",
    });
    const stop = router.start();
    await waitFor(() => router.status.value === "ready");

    // SPA directory rules: from /blog, relative "post" → /blog/post
    router.navigate("post");
    await waitFor(() => router.location.value.pathname === "/blog/post");
    expect(router.matches.value.map((m) => m.id)).toContain("post");

    // Absolute paths are unchanged
    router.navigate("/post");
    await waitFor(() => router.location.value.pathname === "/post");
    expect(router.matches.value.map((m) => m.id)).toContain("root-post");

    router.navigate("/blog/post");
    await waitFor(() => router.location.value.pathname === "/blog/post");

    // Relative parent: /blog/post + .. → /blog
    router.navigate("..");
    await waitFor(() => router.location.value.pathname === "/blog");
    stop();
  });

  it("does not grow stack on identical navigate", async () => {
    const router = createRouter({
      routes,
      history: "memory",
      initialPath: "/",
    });
    const stop = router.start();
    await waitFor(() => router.status.value === "ready");

    router.navigate("/about");
    await waitFor(() => router.location.value.pathname === "/about");
    router.navigate("/about");
    await flush();
    router.back();
    await waitFor(() => router.location.value.pathname === "/");
    stop();
  });

  it("sets status idle when disposed mid-load", async () => {
    let resolve!: (v: string) => void;
    const promise = new Promise<string>((r) => {
      resolve = r;
    });
    const slowRoutes: RouteDef[] = [
      {
        path: "/",
        id: "root",
        children: [
          { index: true, path: "", id: "home" },
          {
            path: "slow",
            id: "slow",
            loader: () => promise,
          },
        ],
      },
    ];
    const router = createRouter({
      routes: slowRoutes,
      history: "memory",
      initialPath: "/",
    });
    const stop = router.start();
    await waitFor(() => router.status.value === "ready");
    router.navigate("/slow");
    await waitFor(() => router.status.value === "loading");
    stop();
    expect(router.status.value).toBe("idle");
    resolve("late");
    await flush();
    expect(router.location.value.pathname).toBe("/");
  });
});
