import { afterEach, describe, expect, it } from "vitest";
import { createRouter, Link, Router } from "../index.ts";
import type { RouteDef } from "../src/core/types.ts";
import { cleanup, mount, waitFor } from "./helpers.ts";

let el: HTMLElement | null = null;

afterEach(() => {
  cleanup(el);
  el = null;
});

describe("Link", () => {
  it("navigates on click without full reload", async () => {
    function Page() {
      return (
        <div>
          <Link href="/b">Go</Link>
          <span data-testid="path">marker</span>
        </div>
      );
    }

    const routes: RouteDef[] = [
      {
        path: "/",
        id: "root",
        component: Page,
        children: [
          { index: true, path: "", id: "a" },
          { path: "b", id: "b" },
        ],
      },
    ];

    const router = createRouter({ routes, history: "memory", initialPath: "/" });
    el = mount(<Router router={router} />);
    await waitFor(() => router.status.value === "ready");

    el!.querySelector("a")!.click();
    await waitFor(() => router.location.value.pathname === "/b");
    expect(router.matches.value.map((m) => m.id)).toContain("b");
  });

  it("prefixes href with base for progressive enhancement", async () => {
    function Page() {
      return <Link href="/about">About</Link>;
    }
    const routes: RouteDef[] = [
      {
        path: "/",
        id: "root",
        component: Page,
        children: [
          { index: true, path: "", id: "home" },
          { path: "about", id: "about" },
        ],
      },
    ];
    const router = createRouter({
      routes,
      history: "memory",
      initialPath: "/",
      base: "/app",
    });
    el = mount(<Router router={router} />);
    await waitFor(() => router.status.value === "ready");
    expect(el!.querySelector("a")?.getAttribute("href")).toBe("/app/about");

    el!.querySelector("a")!.click();
    await waitFor(() => router.location.value.pathname === "/about");
    expect(router.__history.location.pathname).toBe("/app/about");
  });
});
