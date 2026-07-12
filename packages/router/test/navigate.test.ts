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
});
