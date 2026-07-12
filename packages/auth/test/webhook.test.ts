import { describe, it, expect, vi, beforeEach } from "vitest";

const verifyWebhookMock = vi.fn();
vi.mock("@clerk/backend/webhooks", () => ({
  verifyWebhook: (...args: unknown[]) => verifyWebhookMock(...args),
}));

import { createWebhookRouter } from "../src/server/webhook.ts";
import { createRateLimiter } from "../src/server/rate-limit.ts";

const USER_CREATED = {
  type: "user.created",
  object: "event",
  data: { id: "user_123", email_addresses: [], object: "user" },
  event_attributes: { http_request: { client_ip: "1.2.3.4", user_agent: "clerk" } },
};

beforeEach(() => {
  verifyWebhookMock.mockReset();
});

describe("createWebhookRouter", () => {
  it("verifies, dispatches to the registered handler, and returns 200", async () => {
    verifyWebhookMock.mockResolvedValue(USER_CREATED);
    const router = createWebhookRouter();
    const handler = vi.fn();
    router.on("user.created", handler);

    const res = await router.handle(new Request("https://app.example.com/webhook", { method: "POST" }));

    expect(res.status).toBe(200);
    expect(verifyWebhookMock).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(USER_CREATED);
    const body = await res.json();
    expect(body).toEqual({ received: true, type: "user.created" });
  });

  it("narrows the event type so a handler sees the right payload shape", async () => {
    verifyWebhookMock.mockResolvedValue(USER_CREATED);
    const router = createWebhookRouter();
    let capturedId: string | undefined;
    router.on("user.created", (evt) => {
      if (evt.type === "user.created") {
        capturedId = evt.data.id;
      }
    });
    await router.handle(new Request("https://x", { method: "POST" }));
    expect(capturedId).toBe("user_123");
  });

  it("supports multiple handlers for the same event type", async () => {
    verifyWebhookMock.mockResolvedValue(USER_CREATED);
    const router = createWebhookRouter();
    const a = vi.fn();
    const b = vi.fn();
    router.on("user.created", a);
    router.on("user.created", b);
    await router.handle(new Request("https://x", { method: "POST" }));
    expect(a).toHaveBeenCalledOnce();
    expect(b).toHaveBeenCalledOnce();
  });

  it("returns 200 for an unhandled event type (acknowledge, no-op)", async () => {
    verifyWebhookMock.mockResolvedValue({ ...USER_CREATED, type: "session.created", data: { id: "sess_1", object: "session" } });
    const router = createWebhookRouter();
    const res = await router.handle(new Request("https://x", { method: "POST" }));
    expect(res.status).toBe(200);
  });

  it("returns 400 when verification fails", async () => {
    verifyWebhookMock.mockRejectedValue(new Error("bad signature"));
    const router = createWebhookRouter();
    const res = await router.handle(new Request("https://x", { method: "POST" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("webhook_verification_failed");
  });

  it("returns 500 when a handler throws", async () => {
    verifyWebhookMock.mockResolvedValue(USER_CREATED);
    const router = createWebhookRouter();
    router.on("user.created", () => {
      throw new Error("db down");
    });
    const res = await router.handle(new Request("https://x", { method: "POST" }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("webhook_handler_failed");
    expect(body.type).toBe("user.created");
  });

  it("returns 429 when the rate limiter denies the delivery", async () => {
    const limiter = createRateLimiter({ capacity: 1, refillRate: 1, now: () => 0 });
    const router = createWebhookRouter({ rateLimiter: limiter });
    limiter.check("anonymous"); // exhaust
    const res = await router.handle(new Request("https://x", { method: "POST" }));
    expect(res.status).toBe(429);
    expect(verifyWebhookMock).not.toHaveBeenCalled();
    const retryAfter = res.headers.get("retry-after");
    expect(retryAfter).toBeDefined();
    expect(Number(retryAfter)).toBeGreaterThan(0);
  });

  it("forwards signingSecret to verifyWebhook", async () => {
    verifyWebhookMock.mockResolvedValue(USER_CREATED);
    const router = createWebhookRouter({ signingSecret: "whsec_xxx" });
    await router.handle(new Request("https://x", { method: "POST" }));
    expect(verifyWebhookMock).toHaveBeenCalledWith(expect.any(Request), { signingSecret: "whsec_xxx" });
  });
});
