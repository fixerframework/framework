import { describe, expect, it } from "vitest";
import { createRouter } from "../src/core/create-router.ts";
import { redirect, type RouteDef } from "../src/core/types.ts";
import { deferred, waitFor } from "./helpers.ts";

describe("loaders", () => {
  it("runs loaders and exposes getLoaderData", async () => {
    const routes: RouteDef[] = [
      {
        path: "/",
        id: "root",
        loader: async () => ({ root: true }),
        children: [
          {
            path: "posts/:slug",
            id: "post",
            loader: async ({ params }) => ({ slug: params.slug }),
          },
        ],
      },
    ];

    const router = createRouter({
      routes,
      history: "memory",
      initialPath: "/posts/hello",
    });
    const stop = router.start();
    await waitFor(() => router.status.value === "ready");

    expect(router.getLoaderData("root")).toEqual({ root: true });
    expect(router.getLoaderData("post")).toEqual({ slug: "hello" });
    stop();
  });

  it("reuses parent loader when only child params change", async () => {
    let rootLoads = 0;
    let postLoads = 0;
    const routes: RouteDef[] = [
      {
        path: "/",
        id: "root",
        loader: async () => {
          rootLoads++;
          return { root: rootLoads };
        },
        children: [
          {
            path: "posts/:slug",
            id: "post",
            loader: async ({ params }) => {
              postLoads++;
              return { slug: params.slug, n: postLoads };
            },
          },
        ],
      },
    ];

    const router = createRouter({
      routes,
      history: "memory",
      initialPath: "/posts/a",
    });
    const stop = router.start();
    await waitFor(() => router.status.value === "ready");
    expect(rootLoads).toBe(1);
    expect(postLoads).toBe(1);

    router.navigate("/posts/b");
    await waitFor(() => router.params.value.slug === "b" && router.status.value === "ready");
    expect(rootLoads).toBe(1);
    expect(postLoads).toBe(2);
    expect(router.getLoaderData("post")).toEqual({ slug: "b", n: 2 });
    stop();
  });

  it("aborts previous loader when navigating quickly", async () => {
    const slow = deferred<string>();
    let aborted = false;
    const routes: RouteDef[] = [
      {
        path: "/",
        id: "root",
        children: [
          { index: true, path: "", id: "home" },
          {
            path: "slow",
            id: "slow",
            loader: async ({ signal }) => {
              signal.addEventListener("abort", () => {
                aborted = true;
              });
              return slow.promise;
            },
          },
          {
            path: "fast",
            id: "fast",
            loader: async () => "fast",
          },
        ],
      },
    ];

    const router = createRouter({
      routes,
      history: "memory",
      initialPath: "/",
    });
    const stop = router.start();
    await waitFor(() => router.status.value === "ready");

    router.navigate("/slow");
    await waitFor(() => router.status.value === "loading");
    router.navigate("/fast");
    await waitFor(
      () => router.status.value === "ready" && router.location.value.pathname === "/fast",
    );

    expect(aborted).toBe(true);
    expect(router.getLoaderData("fast")).toBe("fast");
    // resolve slow late — should not clobber
    slow.resolve("slow");
    await new Promise((r) => setTimeout(r, 10));
    expect(router.location.value.pathname).toBe("/fast");
    stop();
  });

  it("handles redirect() from loader", async () => {
    const routes: RouteDef[] = [
      {
        path: "/",
        id: "root",
        children: [
          {
            path: "old",
            id: "old",
            loader: async () => {
              throw redirect("/new");
            },
          },
          { path: "new", id: "new" },
        ],
      },
    ];

    const router = createRouter({
      routes,
      history: "memory",
      initialPath: "/old",
    });
    const stop = router.start();
    await waitFor(
      () => router.location.value.pathname === "/new" && router.status.value === "ready",
    );
    expect(router.matches.value.map((m) => m.id)).toContain("new");
    stop();
  });

  it("detects redirect loops", async () => {
    const routes: RouteDef[] = [
      {
        path: "/",
        id: "root",
        children: [
          {
            path: "a",
            id: "a",
            loader: async () => {
              throw redirect("/b");
            },
          },
          {
            path: "b",
            id: "b",
            loader: async () => {
              throw redirect("/a");
            },
          },
        ],
      },
    ];

    const router = createRouter({
      routes,
      history: "memory",
      initialPath: "/a",
    });
    const stop = router.start();
    await waitFor(() => router.status.value === "error");
    expect(String(router.error.value)).toMatch(/Redirect loop/);
    stop();
  });

  it("surfaces loader errors and commits target location", async () => {
    const routes: RouteDef[] = [
      {
        path: "/",
        id: "root",
        loader: async () => ({ root: true }),
        children: [
          { index: true, path: "", id: "home" },
          {
            path: "boom",
            id: "boom",
            loader: async () => {
              throw new Error("kaboom");
            },
          },
        ],
      },
    ];

    const router = createRouter({
      routes,
      history: "memory",
      initialPath: "/",
    });
    const stop = router.start();
    await waitFor(() => router.status.value === "ready");

    router.navigate("/boom");
    await waitFor(() => router.status.value === "error");
    expect(String(router.error.value)).toMatch(/kaboom/);
    expect(router.location.value.pathname).toBe("/boom");
    expect(router.__history.location.pathname).toBe("/boom");
    expect(router.matches.value.map((m) => m.id)).toEqual(["root", "boom"]);
    // Ancestor loader data retained
    expect(router.getLoaderData("root")).toEqual({ root: true });
    stop();
  });

  it("runs beforeLoad on every navigation even when loader is reused", async () => {
    let before = 0;
    let rootLoads = 0;
    const routes: RouteDef[] = [
      {
        path: "/",
        id: "root",
        beforeLoad: async () => {
          before++;
        },
        loader: async () => {
          rootLoads++;
          return { root: rootLoads };
        },
        children: [
          { path: "a", id: "a" },
          { path: "b", id: "b" },
        ],
      },
    ];

    const router = createRouter({
      routes,
      history: "memory",
      initialPath: "/a",
    });
    const stop = router.start();
    await waitFor(() => router.status.value === "ready");
    expect(before).toBe(1);
    expect(rootLoads).toBe(1);

    router.navigate("/b");
    await waitFor(() => router.location.value.pathname === "/b" && router.status.value === "ready");
    expect(before).toBe(2);
    expect(rootLoads).toBe(1);
    stop();
  });

  it("re-runs loaders when search string changes", async () => {
    let loads = 0;
    const routes: RouteDef[] = [
      {
        path: "/",
        id: "root",
        children: [
          {
            path: "q",
            id: "q",
            loader: async ({ search }) => {
              loads++;
              return { search, n: loads };
            },
          },
        ],
      },
    ];

    const router = createRouter({
      routes,
      history: "memory",
      initialPath: "/q?x=1",
    });
    const stop = router.start();
    await waitFor(() => router.status.value === "ready");
    expect(loads).toBe(1);
    expect(router.getLoaderData("q")).toEqual({ search: "?x=1", n: 1 });

    router.navigate("/q?x=2");
    await waitFor(() => router.status.value === "ready" && loads === 2);
    expect(router.getLoaderData("q")).toEqual({ search: "?x=2", n: 2 });

    router.navigate("/q?x=2");
    await waitFor(() => router.status.value === "ready");
    // Same URL no-op — no extra load
    expect(loads).toBe(2);
    stop();
  });
});
