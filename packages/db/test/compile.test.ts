import { describe, it, expect } from "vitest";
import { sql } from "../src/core/sql.ts";
import { compile } from "../src/core/compile.ts";

describe("compile", () => {
  it("uses $n placeholders for postgres", () => {
    const c = compile(sql`SELECT ${1}, ${"a"}`, "postgres");
    expect(c.text).toBe("SELECT $1, $2");
    expect(c.values).toEqual([1, "a"]);
  });

  it("uses ? placeholders for mysql and sqlite", () => {
    expect(compile(sql`SELECT ${1}`, "mysql").text).toBe("SELECT ?");
    expect(compile(sql`SELECT ${1}`, "sqlite").text).toBe("SELECT ?");
  });

  it("uses @pN placeholders for mssql", () => {
    const c = compile(sql`SELECT ${1}, ${2}`, "mssql");
    expect(c.text).toBe("SELECT @p1, @p2");
    expect(c.values).toEqual([1, 2]);
  });

  it("inlines sql.raw without params", () => {
    const c = compile(sql`SELECT ${sql.raw("COUNT(*)")} FROM t`, "postgres");
    expect(c.text).toBe("SELECT COUNT(*) FROM t");
    expect(c.values).toEqual([]);
  });

  it("quotes identifiers per dialect", () => {
    expect(compile(sql`SELECT * FROM ${sql.id("users")}`, "postgres").text).toBe(
      'SELECT * FROM "users"',
    );
    expect(compile(sql`SELECT * FROM ${sql.id("users")}`, "mysql").text).toBe(
      "SELECT * FROM `users`",
    );
    expect(compile(sql`SELECT * FROM ${sql.id("users")}`, "mssql").text).toBe(
      "SELECT * FROM [users]",
    );
    expect(compile(sql`SELECT * FROM ${sql.id("public", "users")}`, "postgres").text).toBe(
      'SELECT * FROM "public"."users"',
    );
  });

  it("encodes booleans for sqlite as 0/1", () => {
    const c = compile(sql`SELECT ${true}`, "sqlite");
    expect(c.values).toEqual([1]);
  });

  it("encodes dates", () => {
    const d = new Date("2024-06-15T12:00:00.000Z");
    const pg = compile(sql`SELECT ${d}`, "postgres");
    expect(pg.values[0]).toBeInstanceOf(Date);

    const lite = compile(sql`SELECT ${d}`, "sqlite");
    expect(lite.values[0]).toBe("2024-06-15T12:00:00.000Z");
  });

  it("skips encoding when encodeParams is false", () => {
    const c = compile(sql`SELECT ${true}`, "sqlite", { encodeParams: false });
    expect(c.values).toEqual([true]);
  });
});
