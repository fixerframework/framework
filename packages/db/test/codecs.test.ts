import { describe, it, expect } from "vitest";
import { getCodec } from "../src/dialect/codecs.ts";

describe("type codecs", () => {
  const dialects = ["postgres", "mysql", "sqlite", "mssql"] as const;

  for (const dialect of dialects) {
    describe(dialect, () => {
      const codec = getCodec(dialect);

      it("encodes null", () => {
        expect(codec.encode(null)).toBeNull();
      });

      it("encodes strings and numbers", () => {
        expect(codec.encode("hi")).toBe("hi");
        expect(codec.encode(42)).toBe(42);
      });

      it("encodes json objects as strings", () => {
        const enc = codec.encode({ a: 1 }, "json");
        expect(typeof enc === "string" ? JSON.parse(enc as string) : enc).toEqual({ a: 1 });
      });

      it("encodes Uint8Array for blob/bytea", () => {
        const buf = new Uint8Array([1, 2, 3]);
        expect(codec.encode(buf, "bytea")).toBe(buf);
      });

      it("encodes uuid as string", () => {
        const id = "550e8400-e29b-41d4-a716-446655440000";
        expect(codec.encode(id, "uuid")).toBe(id);
      });

      it("decodes null", () => {
        expect(codec.decode(null)).toBeNull();
      });
    });
  }

  it("sqlite encodes boolean as 0/1", () => {
    const c = getCodec("sqlite");
    expect(c.encode(true)).toBe(1);
    expect(c.encode(false)).toBe(0);
  });

  it("postgres keeps boolean as boolean", () => {
    const c = getCodec("postgres");
    expect(c.encode(true)).toBe(true);
  });

  it("decodes json strings", () => {
    const c = getCodec("mysql");
    expect(c.decode('{"x":1}', "json")).toEqual({ x: 1 });
  });

  it("decodes timestamps to Date when hinted", () => {
    const c = getCodec("postgres");
    const d = c.decode("2024-01-01T00:00:00.000Z", "timestamptz");
    expect(d).toBeInstanceOf(Date);
  });
});
