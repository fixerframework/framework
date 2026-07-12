import { describe, it, expect } from "vitest";
import { sql, isSqlFragment, isSqlRaw, isSqlIdent } from "../src/core/sql.ts";

describe("sql tagged template", () => {
  it("builds a simple fragment with params", () => {
    const frag = sql`SELECT * FROM users WHERE id = ${1}`;
    expect(isSqlFragment(frag)).toBe(true);
    expect(frag.strings).toEqual(["SELECT * FROM users WHERE id = ", ""]);
    expect(frag.values).toEqual([1]);
  });

  it("composes nested fragments", () => {
    const where = sql`active = ${true}`;
    const frag = sql`SELECT * FROM users WHERE ${where}`;
    expect(frag.strings.join("?")).toContain("SELECT * FROM users WHERE ");
    expect(frag.strings.join("?")).toContain("active = ");
    expect(frag.values).toEqual([true]);
  });

  it("sql.raw inserts trusted text without a parameter", () => {
    const frag = sql`SELECT ${sql.raw("1 + 1")} AS n`;
    expect(isSqlRaw(frag.values[0]!)).toBe(true);
    expect(frag.values).toHaveLength(1);
  });

  it("sql.id creates an identifier token", () => {
    const id = sql.id("public", "users");
    expect(isSqlIdent(id)).toBe(true);
    expect(id.parts).toEqual(["public", "users"]);
  });

  it("sql.join composes lists", () => {
    const frag = sql`SELECT * FROM t WHERE id IN (${sql.join([1, 2, 3])})`;
    expect(frag.values).toEqual([1, 2, 3]);
  });

  it("sql.join with empty list yields empty fragment", () => {
    expect(sql.join([]).strings).toEqual([""]);
    expect(sql.join([]).values).toEqual([]);
  });

  it("sql.empty is a no-op fragment", () => {
    const frag = sql`SELECT 1 ${sql.empty}`;
    expect(frag.values).toEqual([]);
  });
});
