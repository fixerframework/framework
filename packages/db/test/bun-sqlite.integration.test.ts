import { describe, it, expect } from "vitest";
import { createDb, sql } from "../index.ts";
import { bunSqlite } from "../bun-sqlite.ts";

async function canUseBunSqlite(): Promise<boolean> {
  try {
    await import("bun:sqlite");
    return true;
  } catch {
    return false;
  }
}

const bunSqliteAvailable = await canUseBunSqlite();

describe.skipIf(!bunSqliteAvailable)("bun-sqlite integration", () => {
  it("creates table, inserts, selects typed rows", async () => {
    const db = createDb(await bunSqlite({ path: ":memory:" }));

    await db.execute(sql`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY,
        email TEXT NOT NULL,
        active INTEGER NOT NULL
      )
    `);

    await db.execute(
      sql`INSERT INTO users (id, email, active) VALUES (${1}, ${"a@example.com"}, ${true})`,
    );

    const rows = await db.query<{ id: number; email: string; active: number }>(
      sql`SELECT id, email, active FROM users WHERE id = ${1}`,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.email).toBe("a@example.com");
    expect(rows[0]?.active).toBe(1);

    await db.transaction(async (tx) => {
      await tx.execute(
        sql`INSERT INTO users (id, email, active) VALUES (${2}, ${"b@example.com"}, ${false})`,
      );
    });

    const count = await db.query<{ n: number }>(sql`SELECT COUNT(*) AS n FROM users`);
    expect(count[0]?.n).toBe(2);

    await db.close();
  });
});
