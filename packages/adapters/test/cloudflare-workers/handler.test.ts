import { describe, it, expect, vi } from "vitest";
import {
  createWorkerHandler,
  type WorkersEnv,
  type ExecutionContext,
} from "../../src/cloudflare-workers/handler.ts";

function makeEnv(partial?: Partial<WorkersEnv>): WorkersEnv {
  const assetsFetch = vi.fn(async () => new Response("static", { status: 200 }));
  return {
    ASSETS: { fetch: assetsFetch },
    ...partial,
  };
}

function makeCtx(): ExecutionContext {
  return {
    waitUntil: vi.fn(),
    passThroughOnException: vi.fn(),
  };
}

describe("createWorkerHandler", () => {
  it("delegates static asset requests to ASSETS binding", async () => {
    const handler = vi.fn(async () => new Response("app", { status: 200 }));
    const fetch = createWorkerHandler(handler);
    const env = makeEnv();
    const request = new Request("https://example.com/assets/index-abc123.js");

    const res = await fetch(request, env, makeCtx());

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("static");
    expect(env.ASSETS!.fetch).toHaveBeenCalledWith(request);
    expect(handler).not.toHaveBeenCalled();
  });

  it("delegates requests with static path prefix to ASSETS", async () => {
    const handler = vi.fn(async () => new Response("app", { status: 200 }));
    const fetch = createWorkerHandler(handler);
    const env = makeEnv();

    await fetch(new Request("https://example.com/static/logo.png"), env, makeCtx());

    expect(env.ASSETS!.fetch).toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
  });

  it("passes non-asset requests to the app handler", async () => {
    const handler = vi.fn(async (req: Request) =>
      new Response(`app:${new URL(req.url).pathname}`, { status: 200 }),
    );
    const fetch = createWorkerHandler(handler);
    const env = makeEnv();
    const request = new Request("https://example.com/dashboard");

    const res = await fetch(request, env, makeCtx());

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("app:/dashboard");
    expect(handler).toHaveBeenCalledWith(request);
    expect(env.ASSETS!.fetch).not.toHaveBeenCalled();
  });

  it("passes API-like paths to the app handler", async () => {
    const handler = vi.fn(async () => new Response("api", { status: 200 }));
    const fetch = createWorkerHandler(handler);
    const env = makeEnv();

    await fetch(new Request("https://example.com/api/users"), env, makeCtx());

    expect(handler).toHaveBeenCalled();
    expect(env.ASSETS!.fetch).not.toHaveBeenCalled();
  });

  it("respects custom exclude patterns", async () => {
    const handler = vi.fn(async () => new Response("app", { status: 200 }));
    const fetch = createWorkerHandler(handler, {
      exclude: [/^\/health(?:\/.*)?$/],
    });
    const env = makeEnv();

    await fetch(new Request("https://example.com/health"), env, makeCtx());

    expect(env.ASSETS!.fetch).toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
  });

  it("falls through to app handler for static paths when ASSETS is missing", async () => {
    const handler = vi.fn(async () => new Response("app-fallback", { status: 200 }));
    const fetch = createWorkerHandler(handler);
    const env: WorkersEnv = {};

    const res = await fetch(
      new Request("https://example.com/assets/app.js"),
      env,
      makeCtx(),
    );

    expect(await res.text()).toBe("app-fallback");
    expect(handler).toHaveBeenCalled();
  });

  it("uses a custom assets binding name", async () => {
    const handler = vi.fn(async () => new Response("app", { status: 200 }));
    const staticFetch = vi.fn(async () => new Response("from-static", { status: 200 }));
    const fetch = createWorkerHandler(handler, { assetsBinding: "STATIC" });
    const env: WorkersEnv = {
      STATIC: { fetch: staticFetch },
    };

    const res = await fetch(
      new Request("https://example.com/favicon.ico"),
      env,
      makeCtx(),
    );

    expect(await res.text()).toBe("from-static");
    expect(staticFetch).toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
  });

  it("preserves the original request method for the app handler", async () => {
    const handler = vi.fn(async (req: Request) => new Response(req.method, { status: 200 }));
    const fetch = createWorkerHandler(handler);
    const env = makeEnv();
    const request = new Request("https://example.com/page", { method: "POST" });

    const res = await fetch(request, env, makeCtx());

    expect(await res.text()).toBe("POST");
  });
});
