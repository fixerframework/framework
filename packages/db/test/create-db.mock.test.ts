import { describe, it, expect, vi } from "vitest";
import { createDb } from "../src/core/create-db.ts";
import { sql } from "../src/core/sql.ts";
import { createMockDriver } from "../src/drivers/mock.ts";
import { DbError } from "../src/core/errors.ts";

describe("createDb + mock driver", () => {
  it("query returns rows", async () => {
    const driverPg = createMockDriver({
      dialect: "postgres",
      onExecute: async (c) => {
        expect(c.text).toContain("$1");
        return { rows: [{ id: 1 }], rowCount: 1 };
      },
    });
    const db = createDb(driverPg);
    const rows = await db.query<{ id: number }>(sql`SELECT id FROM users WHERE id = ${1}`);
    expect(rows).toEqual([{ id: 1 }]);
  });

  it("execute returns rowCount", async () => {
    const driver = createMockDriver({
      onExecute: async () => ({ rows: [], rowCount: 3 }),
    });
    const db = createDb(driver);
    const res = await db.execute(sql`DELETE FROM users WHERE active = ${false}`);
    expect(res.rowCount).toBe(3);
  });

  it("transaction commits on success", async () => {
    const commit = vi.fn(async () => {});
    const rollback = vi.fn(async () => {});
    const driver = createMockDriver({
      onExecute: async () => ({ rows: [], rowCount: 1 }),
    });
    // wrap begin
    const originalBegin = driver.begin.bind(driver);
    driver.begin = async () => {
      const tx = await originalBegin();
      return {
        execute: tx.execute.bind(tx),
        commit,
        rollback,
      };
    };

    const db = createDb(driver);
    await db.transaction(async (tx) => {
      await tx.execute(sql`UPDATE t SET x = ${1}`);
    });
    expect(commit).toHaveBeenCalled();
    expect(rollback).not.toHaveBeenCalled();
  });

  it("transaction rolls back on error", async () => {
    const commit = vi.fn(async () => {});
    const rollback = vi.fn(async () => {});
    const driver = createMockDriver();
    const originalBegin = driver.begin.bind(driver);
    driver.begin = async () => {
      const tx = await originalBegin();
      return {
        execute: tx.execute.bind(tx),
        commit,
        rollback,
      };
    };

    const db = createDb(driver);
    await expect(
      db.transaction(async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(rollback).toHaveBeenCalled();
    expect(commit).not.toHaveBeenCalled();
  });

  it("throws TX_UNSUPPORTED when driver rejects begin", async () => {
    const driver = createMockDriver({ noTx: true });
    const db = createDb(driver);
    await expect(db.transaction(async (tx) => tx)).rejects.toBeInstanceOf(DbError);
  });

  it("throws CLOSED after close", async () => {
    const driver = createMockDriver({
      onExecute: async () => ({ rows: [], rowCount: 0 }),
    });
    const db = createDb(driver);
    await db.close();
    await expect(db.query(sql`SELECT 1`)).rejects.toMatchObject({ code: "CLOSED" });
  });
});
