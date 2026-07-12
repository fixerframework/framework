import { describe, it, expect, vi, beforeEach } from "vitest";

const verifyTokenMock = vi.fn();
vi.mock("@clerk/backend", () => ({
  verifyToken: (...args: unknown[]) => verifyTokenMock(...args),
}));

import { protect, buildClerkRedirect, defaultKeyGenerator } from "../src/server/protect.ts";
import { createRateLimiter } from "../src/server/rate-limit.ts";

const CLAIMS = { sub: "user_1", sid: "sess_1", iss: "https://clerk.example.com", __raw: "r" };

function authedRequest(url = "https://app.example.com/dashboard", token = "Bearer good.jwt") {
  return new Request(url, { headers: { Authorization: token } });
}

beforeEach(() => {
  verifyTokenMock.mockReset();
});

describe("defaultKeyGenerator", () => {
  it("prefers cf-connecting-ip over x-forwarded-for", () => {
    const req = new Request("https://x", {
      headers: { "x-forwarded-for": "spoofed, 1.2.3.4", "cf-connecting-ip": "9.9.9.9" },
    });
    expect(defaultKeyGenerator(req)).toBe("9.9.9.9");
  });
  it("prefers x-real-ip over x-forwarded-for", () => {
    const req = new Request("https://x", {
      headers: { "x-forwarded-for": "spoofed, 1.2.3.4", "x-real-ip": "10.0.0.1" },
    });
    expect(defaultKeyGenerator(req)).toBe("10.0.0.1");
  });
  it("uses the last (closest proxy) x-forwarded-for entry", () => {
    const req = new Request("https://x", { headers: { "x-forwarded-for": "spoofed, 1.2.3.4" } });
    expect(defaultKeyGenerator(req)).toBe("1.2.3.4");
  });
  it("falls back to anonymous when no IP header is present", () => {
    expect(defaultKeyGenerator(new Request("https://x"))).toBe("anonymous");
  });
});

describe("buildClerkRedirect", () => {
  it("appends redirect_url with a ?", () => {
    expect(buildClerkRedirect("https://clerk.example.com/sign-in", "https://app/x")).toBe(
      "https://clerk.example.com/sign-in?redirect_url=https%3A%2F%2Fapp%2Fx",
    );
  });
  it("appends with & when the base already has a query", () => {
    expect(buildClerkRedirect("https://clerk.example.com/sign-in?clerk_js=1", "/dash")).toBe(
      "https://clerk.example.com/sign-in?clerk_js=1&redirect_url=%2Fdash",
    );
  });
});

describe("protect", () => {
  const verify = { secretKey: "sk_test" };
  const signInUrl = "https://clerk.example.com/sign-in";

  it("returns authenticated identity on a valid token", async () => {
    verifyTokenMock.mockResolvedValue(CLAIMS);
    const result = await protect(authedRequest(), { verify, signInUrl });
    expect(result.status).toBe("authenticated");
    if (result.status === "authenticated") expect(result.userId).toBe("user_1");
  });

  it("redirects to Clerk when no token is present", async () => {
    const req = new Request("https://app.example.com/secret");
    const result = await protect(req, { verify, signInUrl });
    expect(result.status).toBe("redirect");
    if (result.status !== "redirect") return;
    expect(result.response.status).toBe(302);
    expect(result.response.headers.get("location")).toBe(
      "https://clerk.example.com/sign-in?redirect_url=https%3A%2F%2Fapp.example.com%2Fsecret",
    );
    expect(result.response.headers.get("cache-control")).toBe("no-store");
  });

  it("redirects when the token fails verification", async () => {
    verifyTokenMock.mockRejectedValue(new Error("bad sig"));
    const result = await protect(authedRequest(), { verify, signInUrl });
    expect(result.status).toBe("redirect");
  });

  it("returns 429 with Retry-After when the rate limiter denies", async () => {
    const limiter = createRateLimiter({ capacity: 1, refillRate: 1, now: () => 1000 });
    const req = new Request("https://x", { headers: { "x-forwarded-for": "1.1.1.1" } });
    // Exhaust the single token.
    limiter.check("1.1.1.1");
    const result = await protect(req, { verify, signInUrl, rateLimiter: limiter });
    expect(result.status).toBe("rate_limited");
    if (result.status !== "rate_limited") return;
    expect(result.response.status).toBe(429);
    expect(result.response.headers.get("retry-after")).toMatch(/^\d+$/);
    const body = await result.response.json();
    expect(body.error).toBe("rate_limit_exceeded");
  });

  it("uses a custom redirectUrl override (string or function)", async () => {
    const req = new Request("https://app.example.com/x");
    const r1 = await protect(req, { verify, signInUrl, redirectUrl: "/after" });
    if (r1.status !== "redirect") throw new Error("expected redirect");
    expect(r1.response.headers.get("location")).toContain("redirect_url=%2Fafter");

    const r2 = await protect(req, { verify, signInUrl, redirectUrl: () => "/dynamic" });
    if (r2.status !== "redirect") throw new Error("expected redirect");
    expect(r2.response.headers.get("location")).toContain("redirect_url=%2Fdynamic");
  });

  it("returns 401 JSON when the client accepts JSON and no token is present", async () => {
    const req = new Request("https://app.example.com/api", {
      headers: { accept: "application/json" },
    });
    const result = await protect(req, { verify, signInUrl });
    expect(result.status).toBe("unauthenticated");
    if (result.status !== "unauthenticated") return;
    expect(result.response.status).toBe(401);
    expect(result.response.headers.get("content-type")).toBe("application/json");
    const body = await result.response.json();
    expect(body.error).toBe("unauthenticated");
  });

  it("returns 401 JSON when the client accepts JSON and token is invalid", async () => {
    verifyTokenMock.mockRejectedValue(new Error("bad"));
    const req = new Request("https://app.example.com/api", {
      headers: { accept: "application/json", Authorization: "Bearer stale.jwt.sig" },
    });
    const result = await protect(req, { verify, signInUrl });
    expect(result.status).toBe("unauthenticated");
    if (result.status !== "unauthenticated") return;
    expect(result.response.status).toBe(401);
  });
});
