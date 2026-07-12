import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Clerk network call so tests are isolated and deterministic.
const verifyTokenMock = vi.fn();
vi.mock("@clerk/backend", () => ({
  verifyToken: (...args: unknown[]) => verifyTokenMock(...args),
}));

import {
  extractSessionToken,
  verifySessionToken,
  requireSession,
} from "../src/server/token.ts";
import { AuthRequiredError } from "../src/errors.ts";

const CLAIMS = {
  sub: "user_abc",
  sid: "sess_1",
  iss: "https://clerk.example.com",
  __raw: "raw.jwt.string",
};

beforeEach(() => {
  verifyTokenMock.mockReset();
});

describe("extractSessionToken", () => {
  it("reads a Bearer token from the Authorization header", () => {
    const req = new Request("https://app.example.com", {
      headers: { Authorization: "Bearer abc.def.ghi" },
    });
    expect(extractSessionToken(req)).toBe("abc.def.ghi");
  });

  it("reads a raw JWT without a scheme", () => {
    const req = new Request("https://app.example.com", {
      headers: { Authorization: "header.payload.signature" },
    });
    expect(extractSessionToken(req)).toBe("header.payload.signature");
  });
  it("rejects a non-JWT raw value without a scheme", () => {
    const req = new Request("https://app.example.com", {
      headers: { Authorization: "rawtoken123" },
    });
    expect(extractSessionToken(req)).toBeNull();
  });

  it("falls back to the __session cookie when no header is present", () => {
    const req = new Request("https://app.example.com", {
      headers: { cookie: "__session=cookie.token.value" },
    });
    expect(extractSessionToken(req)).toBe("cookie.token.value");
  });

  it("prefers the Authorization header over the cookie", () => {
    const req = new Request("https://app.example.com", {
      headers: { Authorization: "Bearer from-header", cookie: "__session=from-cookie" },
    });
    expect(extractSessionToken(req)).toBe("from-header");
  });

  it("supports a custom cookie name", () => {
    const req = new Request("https://app.example.com", {
      headers: { cookie: "other=xyz; __session=ignored" },
    });
    expect(extractSessionToken(req, { cookieName: "other" })).toBe("xyz");
  });

  it("returns null when nothing is present", () => {
    const req = new Request("https://app.example.com");
    expect(extractSessionToken(req)).toBeNull();
  });

  it("returns null for an empty Bearer value", () => {
    const req = new Request("https://app.example.com", {
      headers: { Authorization: "Bearer " },
    });
    expect(extractSessionToken(req)).toBeNull();
  });
});

describe("verifySessionToken", () => {
  it("returns valid claims and userId when verification succeeds", async () => {
    verifyTokenMock.mockResolvedValue(CLAIMS);
    const result = await verifySessionToken("tok", { secretKey: "sk_test" });
    expect(result).toEqual({ valid: true, userId: "user_abc", claims: CLAIMS });
    expect(verifyTokenMock).toHaveBeenCalledWith("tok", { secretKey: "sk_test" });
  });

  it("returns invalid when verifyToken throws", async () => {
    verifyTokenMock.mockRejectedValue(new Error("bad signature"));
    const result = await verifySessionToken("tok");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe("invalid");
      expect((result.error as Error).message).toBe("bad signature");
    }
  });

  it("returns invalid when the payload has no sub claim", async () => {
    verifyTokenMock.mockResolvedValue({ iss: "x", sid: "s", __raw: "r" });
    const result = await verifySessionToken("tok");
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("invalid");
  });

  it("returns invalid when the payload has no sid claim", async () => {
    verifyTokenMock.mockResolvedValue({ sub: "user_1", iss: "x", __raw: "r" });
    const result = await verifySessionToken("tok");
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("invalid");
  });
});

describe("requireSession", () => {
  it("throws AuthRequiredError when no token is present", async () => {
    const req = new Request("https://app.example.com");
    await expect(requireSession(req)).rejects.toBeInstanceOf(AuthRequiredError);
  });

  it("throws when verification fails", async () => {
    verifyTokenMock.mockRejectedValue(new Error("expired"));
    const req = new Request("https://app.example.com", {
      headers: { Authorization: "Bearer stale" },
    });
    await expect(requireSession(req)).rejects.toBeInstanceOf(AuthRequiredError);
  });

  it("returns claims when verification succeeds", async () => {
    verifyTokenMock.mockResolvedValue(CLAIMS);
    const req = new Request("https://app.example.com", {
      headers: { Authorization: "Bearer good" },
    });
    const claims = await requireSession(req, { jwtKey: "pem" });
    expect(claims.sub).toBe("user_abc");
  });
});
