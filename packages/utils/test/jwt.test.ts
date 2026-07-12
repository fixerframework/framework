import { describe, it, expect } from "vitest";
import { base64urlEncode, base64urlDecode, decodeJwt, isJwtExpired } from "../index.ts";

describe("base64urlEncode / base64urlDecode", () => {
  it("round-trips a UTF-8 string", () => {
    const original = "hello world — émojis 🎉";
    const encoded = base64urlEncode(original);
    expect(base64urlDecode(encoded)).toBe(original);
  });

  it("produces URL-safe characters (no +, /, =)", () => {
    expect(base64urlEncode("foobar???")).not.toMatch(/[+/=]/);
  });

  it("encodes a byte array to the expected base64url", () => {
    // "foobar" → standard base64 "Zm9vYmFy" (no padding needed, URL-safe)
    const bytes = new TextEncoder().encode("foobar");
    expect(base64urlEncode(bytes)).toBe("Zm9vYmFy");
  });

  it("decodes a value with omitted padding", () => {
    // "YWJj" is base64 for "abc" — no padding needed
    expect(base64urlDecode("YWJj")).toBe("abc");
  });

  it("decodes a value that needs padding reconstruction", () => {
    // standard base64 "YQ==" for "a" → base64url "YQ"
    expect(base64urlDecode("YQ")).toBe("a");
  });
});

describe("decodeJwt", () => {
  function makeJwt(payload: object): string {
    const header = base64urlEncode(JSON.stringify({ alg: "none", typ: "JWT" }));
    const body = base64urlEncode(JSON.stringify(payload));
    const sig = base64urlEncode("fake");
    return `${header}.${body}.${sig}`;
  }

  it("decodes the payload of a well-formed JWT", () => {
    const token = makeJwt({ sub: "user_123", exp: 9999999999 });
    const payload = decodeJwt(token);
    expect(payload?.sub).toBe("user_123");
    expect(payload?.exp).toBe(9999999999);
  });

  it("returns null for a string with fewer than 2 parts", () => {
    expect(decodeJwt("not-a-jwt")).toBeNull();
    expect(decodeJwt("only.one")).toBe(null);
  });

  it("returns null when the payload is not valid JSON", () => {
    const header = base64urlEncode("h");
    const body = base64urlEncode("not-json");
    expect(decodeJwt(`${header}.${body}`)).toBeNull();
  });
});

describe("isJwtExpired", () => {
  function makeJwt(payload: object): string {
    const header = base64urlEncode(JSON.stringify({ alg: "none", typ: "JWT" }));
    const body = base64urlEncode(JSON.stringify(payload));
    return `${header}.${body}.sig`;
  }

  it("returns false for a future expiry", () => {
    const future = Math.floor(Date.now() / 1000) + 3600;
    expect(isJwtExpired(makeJwt({ exp: future }))).toBe(false);
  });

  it("returns true for a past expiry", () => {
    const past = Math.floor(Date.now() / 1000) - 3600;
    expect(isJwtExpired(makeJwt({ exp: past }))).toBe(true);
  });

  it("respects leeway", () => {
    const soon = Math.floor(Date.now() / 1000) + 5;
    expect(isJwtExpired(makeJwt({ exp: soon }), 10)).toBe(true);
    expect(isJwtExpired(makeJwt({ exp: soon }), 0)).toBe(false);
  });

  it("returns true when exp is missing", () => {
    expect(isJwtExpired(makeJwt({ sub: "x" }))).toBe(true);
  });

  it("returns true for a malformed token", () => {
    expect(isJwtExpired("garbage")).toBe(true);
  });
});
