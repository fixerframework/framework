import { describe, it, expect, vi } from "vitest";
import { createPagesHandler, type PagesFunctionContext, type PagesEnv } from "../../src/cloudflare-pages/handler.ts";

function makeContext(
  pathname: string,
  env?: Partial<PagesEnv>,
): PagesFunctionContext {
  const request = new Request(`https://example.com${pathname}`);
  const assetsFetch = vi.fn(async () => new Response("static", { status: 200 }));
  return {
    request,
    env: {
      ASSETS: { fetch: assetsFetch },
      ...env,
    } satisfies PagesEnv,
    ctx: {
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
    },
    data: {},
    next: vi.fn(async () => new Response("next", { status: 200 })),
  };
}

describe("createPagesHandler", () => {
  it("delegates static asset requests to ASSETS binding", async () => {
    const handler = vi.fn(async () => new Response("app", { status: 200 }));
    const onRequest = createPagesHandler(handler);
    const ctx = makeContext("/assets/index-abc123.js");

    const res = await onRequest(ctx);

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("static");
    expect(ctx.env.ASSETS.fetch).toHaveBeenCalledWith(ctx.request);
    expect(handler).not.toHaveBeenCalled();
  });

  it("delegates requests with static path prefix to ASSETS", async () => {
    const handler = vi.fn(async () => new Response("app", { status: 200 }));
    const onRequest = createPagesHandler(handler);
    const ctx = makeContext("/static/logo.png");

    await onRequest(ctx);

    expect(ctx.env.ASSETS.fetch).toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
  });

  it("passes non-asset requests to the app handler", async () => {
    const handler = vi.fn(async (req: Request) =>
      new Response(`app:${new URL(req.url).pathname}`, { status: 200 }),
    );
    const onRequest = createPagesHandler(handler);
    const ctx = makeContext("/dashboard");

    const res = await onRequest(ctx);

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("app:/dashboard");
    expect(handler).toHaveBeenCalledWith(ctx.request);
    expect(ctx.env.ASSETS.fetch).not.toHaveBeenCalled();
  });

  it("passes API-like paths to the app handler", async () => {
    const handler = vi.fn(async () => new Response("api", { status: 200 }));
    const onRequest = createPagesHandler(handler);
    const ctx = makeContext("/api/users");

    await onRequest(ctx);

    expect(handler).toHaveBeenCalled();
    expect(ctx.env.ASSETS.fetch).not.toHaveBeenCalled();
  });

  it("respects custom exclude patterns", async () => {
    const handler = vi.fn(async () => new Response("app", { status: 200 }));
    const onRequest = createPagesHandler(handler, {
      exclude: [/^\/health(?:\/.*)?$/],
    });
    const ctx = makeContext("/health");

    await onRequest(ctx);

    expect(ctx.env.ASSETS.fetch).toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
  });

  it("preserves the original request object passed to handler", async () => {
    const handler = vi.fn(async (req: Request) => new Response(req.method, { status: 200 }));
    const onRequest = createPagesHandler(handler);
    const ctx = makeContext("/page");

    const postCtx = { ...ctx, request: new Request("https://example.com/page", { method: "POST" }) };
    const res = await onRequest(postCtx);

    expect(await res.text()).toBe("POST");
  });
});
