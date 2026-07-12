import { describe, it, expect } from "vitest";
import { serializeCookie, parseCookies } from "../index.ts";

describe("serializeCookie", () => {
  it("produces a minimal name=value pair", () => {
    expect(serializeCookie("session", "abc")).toBe("session=abc");
  });

  it("URL-encodes the value", () => {
    expect(serializeCookie("key", "a b/c")).toBe("key=a%20b%2Fc");
  });

  it("appends all standard attributes", () => {
    const result = serializeCookie("token", "xyz", {
      domain: "example.com",
      path: "/",
      maxAge: 3600,
      secure: true,
      httpOnly: true,
      sameSite: "lax",
    });
    expect(result).toContain("Domain=example.com");
    expect(result).toContain("Path=/");
    expect(result).toContain("Max-Age=3600");
    expect(result).toContain("Secure");
    expect(result).toContain("HttpOnly");
    expect(result).toContain("SameSite=lax");
  });

  it("includes Expires from a Date", () => {
    const result = serializeCookie("k", "v", { expires: new Date("2026-01-01T00:00:00.000Z") });
    expect(result).toContain("Expires=Thu, 01 Jan 2026 00:00:00 GMT");
  });

  it("omits attributes that are not set", () => {
    const result = serializeCookie("k", "v", { path: "/" });
    expect(result).toBe("k=v; Path=/");
  });
});

describe("parseCookies", () => {
  it("parses a standard Cookie header", () => {
    const result = parseCookies("session=abc; theme=dark");
    expect(result).toEqual({ session: "abc", theme: "dark" });
  });

  it("URL-decodes values", () => {
    const result = parseCookies("key=a%20b%2Fc");
    expect(result.key).toBe("a b/c");
  });

  it("handles malformed pairs gracefully", () => {
    expect(parseCookies("=novalue; good=1")).toEqual({ good: "1" });
    expect(parseCookies("novalue; good=1")).toEqual({ good: "1" });
  });

  it("returns empty for empty input", () => {
    expect(parseCookies("")).toEqual({});
    expect(parseCookies("   ")).toEqual({});
  });
});
