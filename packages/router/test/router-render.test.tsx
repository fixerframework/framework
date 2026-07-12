import { afterEach, describe, expect, it } from "vitest";
import { createRouter, Link, Outlet, Router, useLoaderData, useParams } from "../index.ts";
import type { RouteDef } from "../src/core/types.ts";
import { cleanup, flush, mount, waitFor } from "./helpers.ts";

let el: HTMLElement | null = null;

afterEach(() => {
  cleanup(el);
  el = null;
});

function Layout() {
  return (
    <div data-testid="layout">
      <nav>
        <Link href="/">Home</Link>
        <Link href="/posts/one">Post</Link>
      </nav>
      <Outlet />
    </div>
  );
}

function Home() {
  return <h1>Home</h1>;
}

function Post() {
  const params = useParams();
  const data = useLoaderData<{ title: string }>();
  return (
    <div>
      <h1 data-testid="title">{data?.title ?? "…"}</h1>
      <p data-testid="slug">{params.slug}</p>
    </div>
  );
}

describe("Router render", () => {
  it("renders nested layout and outlet", async () => {
    const routes: RouteDef[] = [
      {
        path: "/",
        id: "root",
        component: Layout,
        children: [
          { index: true, path: "", id: "home", component: Home },
          {
            path: "posts/:slug",
            id: "post",
            component: Post,
            loader: async ({ params }) => ({ title: `Post ${params.slug}` }),
          },
        ],
      },
    ];

    const router = createRouter({
      routes,
      history: "memory",
      initialPath: "/",
    });

    el = mount(<Router router={router} />);
    await waitFor(() => el!.textContent?.includes("Home") === true);
    expect(el!.querySelector("h1")?.textContent).toBe("Home");

    const postLink = el!.querySelector('a[href="/posts/one"]') as HTMLAnchorElement;
    postLink.click();
    await waitFor(() => el!.querySelector("[data-testid=title]")?.textContent === "Post one");
    expect(el!.querySelector("[data-testid=slug]")?.textContent).toBe("one");
  });

  it("Link sets aria-current when active", async () => {
    const routes: RouteDef[] = [
      {
        path: "/",
        id: "root",
        component: Layout,
        children: [{ index: true, path: "", id: "home", component: Home }],
      },
    ];
    const router = createRouter({ routes, history: "memory", initialPath: "/" });
    el = mount(<Router router={router} />);
    await waitFor(() => el!.textContent?.includes("Home") === true);
    await flush();
    const home = el!.querySelector('a[href="/"]');
    expect(home?.getAttribute("aria-current")).toBe("page");
  });
});
