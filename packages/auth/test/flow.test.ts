import { describe, it, expect, vi, beforeEach } from "vitest";
import { encode } from "@auth/core/jwt";

const verifyTokenMock = vi.fn();
vi.mock("@clerk/backend", () => ({
  verifyToken: (...args: unknown[]) => verifyTokenMock(...args),
}));

import { createFlowHandler } from "../src/server/flow.ts";

const SECRET = "test-secret-with-enough-entropy-aaaaaaaaaaaaaaa";
const CLAIMS = { sub: "user_42", sid: "sess_9", iss: "https://clerk.example.com", __raw: "r" };

function config(overrides: Partial<Parameters<typeof createFlowHandler>[0]> = {}) {
  return {
    secret: SECRET,
    signInUrl: "https://clerk.example.com/sign-in",
    callbackPath: "/auth/callback",
    verify: { secretKey: "sk_test", cookieName: "__session" },
    ...overrides,
  };
}

beforeEach(() => {
  verifyTokenMock.mockReset();
});

describe("createFlowHandler — startFlow", () => {
  it("redirects to Clerk with redirect_url pointing at the callback path", () => {
    const flow = createFlowHandler(config());
    const req = new Request("https://app.example.com/protected");
    const res = flow.startFlow(req);
    expect(res.status).toBe(302);
    const location = res.headers.get("location");
    expect(location).toContain("https://clerk.example.com/sign-in");
    expect(location).toContain(`redirect_url=${encodeURIComponent("https://app.example.com/auth/callback")}`);
  });

  it("stashes the return target in the return cookie", () => {
    const flow = createFlowHandler(config());
    const res = flow.startFlow(new Request("https://app.example.com/protected"), "/dashboard");
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("ff_return_to=");
    expect(setCookie).toContain(encodeURIComponent("/dashboard"));
  });
});

describe("createFlowHandler — resumeFlow", () => {
  it("mints an app-session cookie and redirects to the return target on success", async () => {
    verifyTokenMock.mockResolvedValue(CLAIMS);
    const flow = createFlowHandler(config());
    // Callback arrives with a Clerk __session cookie and a stashed return target.
    const req = new Request("https://app.example.com/auth/callback", {
      headers: {
        cookie: "__session=clerk.jwt; ff_return_to=%2Fdashboard",
      },
    });
    const result = await flow.resumeFlow(req);
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.response.status).toBe(302);
    expect(result.response.headers.get("location")).toBe("/dashboard");

    // Two separate Set-Cookie headers, not a comma-joined string.
    const setCookies = result.response.headers.getSetCookie();
    expect(setCookies).toHaveLength(2);
    expect(setCookies.some((c) => c.startsWith("ff_session="))).toBe(true);
    expect(setCookies.some((c) => c.startsWith("ff_return_to=;"))).toBe(true);
  });

  it("returns an error response when no Clerk token is present", async () => {
    const flow = createFlowHandler(config());
    const req = new Request("https://app.example.com/auth/callback");
    const result = await flow.resumeFlow(req);
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.response.status).toBe(400);
  });

  it("returns 401 when Clerk verification fails", async () => {
    verifyTokenMock.mockRejectedValue(new Error("bad"));
    const flow = createFlowHandler(config());
    const req = new Request("https://app.example.com/auth/callback", {
      headers: { cookie: "__session=clerk.jwt" },
    });
    const result = await flow.resumeFlow(req);
    expect(result.status).toBe("error");
    if (result.status !== "error") return;
    expect(result.response.status).toBe(401);
  });

  it("rejects an open redirect — absolute URL in return cookie → fallback to /", async () => {
    verifyTokenMock.mockResolvedValue(CLAIMS);
    const flow = createFlowHandler(config());
    const req = new Request("https://app.example.com/auth/callback", {
      headers: { cookie: "__session=clerk.jwt; ff_return_to=https://evil.com" },
    });
    const result = await flow.resumeFlow(req);
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.response.headers.get("location")).toBe("/");
  });

  it("rejects a protocol-relative redirect — //evil.com → fallback to /", async () => {
    verifyTokenMock.mockResolvedValue(CLAIMS);
    const flow = createFlowHandler(config());
    const req = new Request("https://app.example.com/auth/callback", {
      headers: { cookie: "__session=clerk.jwt; ff_return_to=%2F%2Fevil.com" },
    });
    const result = await flow.resumeFlow(req);
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.response.headers.get("location")).toBe("/");
  });
});

describe("createFlowHandler — readSession", () => {
  it("round-trips a session minted by resumeFlow (real @auth/core/jwt)", async () => {
    verifyTokenMock.mockResolvedValue(CLAIMS);
    const flow = createFlowHandler(config());
    const callbackReq = new Request("https://app.example.com/auth/callback", {
      headers: { cookie: "__session=clerk.jwt; ff_return_to=%2Fx" },
    });
    const result = await flow.resumeFlow(callbackReq);
    if (result.status !== "ok") throw new Error("expected ok");

    // Pull the minted cookie value out and feed it back as if on a new request.
    const setCookie = result.response.headers.get("set-cookie") ?? "";
    const match = setCookie.match(/ff_session=([^;]+)/);
    if (!match?.[1]) throw new Error("session cookie not set");
    const cookieValue = match[1];
    const followReq = new Request("https://app.example.com/anything", {
      headers: { cookie: `ff_session=${cookieValue}` },
    });
    const session = await flow.readSession(followReq);
    expect(session).not.toBeNull();
    expect(session?.userId).toBe("user_42");
    expect(session?.sessionId).toBe("sess_9");
  });

  it("returns null when the cookie is missing", async () => {
    const flow = createFlowHandler(config());
    expect(await flow.readSession(new Request("https://app.example.com/"))).toBeNull();
  });

  it("returns null when the cookie was minted with a different secret", async () => {
    const forged = await encode({
      token: { userId: "evil", sessionId: "s", issuedAt: 0, expiresAt: 0 },
      secret: "wrong-secret-aaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      salt: "fixerframework.auth.session",
      maxAge: 60,
    });
    const flow = createFlowHandler(config());
    const req = new Request("https://app.example.com/", { headers: { cookie: `ff_session=${encodeURIComponent(forged)}` } });
    expect(await flow.readSession(req)).toBeNull();
  });
});

describe("createFlowHandler — clearSession", () => {
  it("returns a 302 that expires both the session and return cookies", () => {
    const flow = createFlowHandler(config());
    const res = flow.clearSession("/goodbye");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/goodbye");
    const setCookies = res.headers.getSetCookie();
    expect(setCookies).toHaveLength(2);
    expect(setCookies.some((c) => c.startsWith("ff_session=;"))).toBe(true);
    expect(setCookies.some((c) => c.startsWith("ff_return_to=;"))).toBe(true);
    expect(setCookies.every((c) => c.includes("Max-Age=0"))).toBe(true);
  });
});
