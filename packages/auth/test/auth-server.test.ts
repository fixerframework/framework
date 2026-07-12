import { describe, it, expect, vi, beforeEach } from "vitest";

const verifyTokenMock = vi.fn();
vi.mock("@clerk/backend", () => ({
  verifyToken: (...args: unknown[]) => verifyTokenMock(...args),
}));

const verifyWebhookMock = vi.fn();
vi.mock("@clerk/backend/webhooks", () => ({
  verifyWebhook: (...args: unknown[]) => verifyWebhookMock(...args),
}));

import { createAuthServer } from "../src/server/auth-server.ts";
import { AuthRequiredError } from "../src/errors.ts";

const CLAIMS = { sub: "user_1", sid: "sess_1", iss: "https://clerk.example.com", __raw: "r" };

const WEBHOOK_EVENT = {
  type: "user.created",
  object: "event",
  data: { id: "user_123", email_addresses: [], object: "user" },
  event_attributes: { http_request: { client_ip: "1.2.3.4", user_agent: "clerk" } },
};

function server(overrides: Partial<Parameters<typeof createAuthServer>[0]> = {}) {
  return createAuthServer({
    publishableKey: "pk_test_x",
    secretKey: "sk_test",
    appSecret: "test-secret-with-enough-entropy-aaaaaaaaaaaaaaa",
    signInUrl: "https://clerk.example.com/sign-in",
    callbackPath: "/auth/callback",
    ...overrides,
  });
}

beforeEach(() => {
  verifyTokenMock.mockReset();
  verifyWebhookMock.mockReset();
});

describe("createAuthServer", () => {
  it("wires a default rate limiter when rateLimit is not specified", () => {
    expect(server().rateLimiter).toBeDefined();
  });

  it("disables rate limiting when rateLimit is false", () => {
    expect(server({ rateLimit: false }).rateLimiter).toBeUndefined();
  });

  it("protect delegates with config-derived verify + signInUrl", async () => {
    verifyTokenMock.mockResolvedValue(CLAIMS);
    const s = server();
    const req = new Request("https://app.example.com/x", { headers: { Authorization: "Bearer t" } });
    const result = await s.protect(req);
    expect(result.status).toBe("authenticated");
    // verifySessionToken received the server's secretKey.
    expect(verifyTokenMock).toHaveBeenCalledWith("t", { secretKey: "sk_test", jwtKey: undefined, audience: undefined, authorizedParties: undefined });
  });

  it("protect redirects to the config signInUrl when unauthenticated", async () => {
    const s = server();
    const result = await s.protect(new Request("https://app.example.com/x"));
    expect(result.status).toBe("redirect");
  });

  it("requireSession throws AuthRequiredError when no token", async () => {
    const s = server();
    await expect(s.requireSession(new Request("https://x"))).rejects.toBeInstanceOf(AuthRequiredError);
  });

  it("readSession returns null before any flow has run", async () => {
    expect(await server().readSession(new Request("https://x"))).toBeNull();
  });

  it("handleWebhook delegates to the webhook router", async () => {
    verifyWebhookMock.mockResolvedValue(WEBHOOK_EVENT);
    const s = server();
    const res = await s.handleWebhook(new Request("https://x", { method: "POST" }));
    expect(res.status).toBe(200);
  });

  it("flow.startFlow redirects to Clerk callback round-trip", async () => {
    verifyTokenMock.mockResolvedValue(CLAIMS);
    const s = server();
    // start
    const startRes = s.flow.startFlow(new Request("https://app.example.com/protected"));
    expect(startRes.status).toBe(302);
    expect(startRes.headers.get("location")).toContain(encodeURIComponent("https://app.example.com/auth/callback"));

    // resume with a Clerk cookie + stashed return target
    const resumeRes = await s.flow.resumeFlow(
      new Request("https://app.example.com/auth/callback", {
        headers: { cookie: "__session=clerk.jwt; ff_return_to=%2Fprotected" },
      }),
    );
    expect(resumeRes.status).toBe("ok");

    // readSession now sees the minted identity
    if (resumeRes.status !== "ok") throw new Error("expected ok");
    const setCookie = resumeRes.response.headers.get("set-cookie") ?? "";
    const match = setCookie.match(/ff_session=([^;]+)/);
    if (!match?.[1]) throw new Error("session cookie not set");
    const session = await s.readSession(new Request("https://x", { headers: { cookie: `ff_session=${match[1]}` } }));
    expect(session?.userId).toBe("user_1");
  });
});
