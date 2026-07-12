import { describe, it, expect } from "vitest";
import { createDb, sql } from "../index.ts";
import { d1, type D1Database } from "../d1.ts";

function createFakeD1(): D1Database & { statements: { sql: string; values: unknown[] }[] } {
  const statements: { sql: string; values: unknown[] }[] = [];
  return {
    statements,
    prepare(query: string) {
      let bound: unknown[] = [];
      const stmt = {
        bind(...values: unknown[]) {
          bound = values;
          return stmt;
        },
        async all<T>() {
          statements.push({ sql: query, values: bound });
          if (/SELECT/i.test(query)) {
            return { results: [{ id: 1, name: "a" }] as T[] };
          }
          return { results: [] as T[] };
        },
        async run() {
          statements.push({ sql: query, values: bound });
          return { meta: { changes: 1 } };
        },
      };
      return stmt;
    },
  };
}

describe("d1 driver", () => {
  it("runs SELECT via prepare/bind/all", async () => {
    const fake = createFakeD1();
    const db = createDb(d1({ database: fake }));
    const rows = await db.query<{ id: number; name: string }>(
      sql`SELECT id, name FROM users WHERE id = ${1}`,
    );
    expect(rows).toEqual([{ id: 1, name: "a" }]);
    expect(fake.statements[0]?.sql).toContain("SELECT");
    expect(fake.statements[0]?.values).toEqual([1]);
  });

  it("runs mutations via run()", async () => {
    const fake = createFakeD1();
    const db = createDb(d1({ database: fake }));
    const res = await db.execute(sql`DELETE FROM users WHERE id = ${2}`);
    expect(res.rowCount).toBe(1);
  });
});
