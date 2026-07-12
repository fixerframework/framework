import type {
  CreateDbOptions,
  Database,
  Driver,
  DriverTx,
  SqlFragment,
} from "./types.ts";
import { compile } from "./compile.ts";
import { DbError } from "./errors.ts";

function wrapTx(driver: Driver, tx: DriverTx, options: CreateDbOptions): Database {
  const closed = { value: false };

  const run = async <T>(fragment: SqlFragment) => {
    if (closed.value) throw new DbError("CLOSED", "Transaction already finished");
    const compiled = compile(fragment, driver.dialect, {
      encodeParams: options.encodeParams,
    });
    try {
      return await tx.execute<T>(compiled);
    } catch (err) {
      if (err instanceof DbError) throw err;
      throw new DbError("QUERY_FAILED", err instanceof Error ? err.message : String(err), err);
    }
  };

  return {
    dialect: driver.dialect,
    async query<T = Record<string, unknown>>(fragment: SqlFragment): Promise<T[]> {
      const result = await run<T>(fragment);
      return result.rows;
    },
    async execute(fragment: SqlFragment) {
      const result = await run(fragment);
      return { rowCount: result.rowCount };
    },
    async transaction() {
      throw new DbError(
        "TX_UNSUPPORTED",
        "Nested transactions are not supported in v1 (use savepoints via raw SQL if needed)",
      );
    },
    async close() {
      // no-op: lifecycle owned by outer transaction
      closed.value = true;
    },
  };
}

/**
 * Create a Database facade over a Driver.
 */
export function createDb(driver: Driver, options: CreateDbOptions = {}): Database {
  let closed = false;

  const run = async <T>(fragment: SqlFragment) => {
    if (closed) throw new DbError("CLOSED", "Database connection is closed");
    const compiled = compile(fragment, driver.dialect, {
      encodeParams: options.encodeParams,
    });
    try {
      return await driver.execute<T>(compiled);
    } catch (err) {
      if (err instanceof DbError) throw err;
      throw new DbError("QUERY_FAILED", err instanceof Error ? err.message : String(err), err);
    }
  };

  const db: Database = {
    dialect: driver.dialect,

    async query<T = Record<string, unknown>>(fragment: SqlFragment): Promise<T[]> {
      const result = await run<T>(fragment);
      return result.rows;
    },

    async execute(fragment: SqlFragment) {
      const result = await run(fragment);
      return { rowCount: result.rowCount };
    },

    async transaction<T>(fn: (tx: Database) => Promise<T>): Promise<T> {
      if (closed) throw new DbError("CLOSED", "Database connection is closed");
      let tx: DriverTx;
      try {
        tx = await driver.begin();
      } catch (err) {
        if (err instanceof DbError) throw err;
        throw new DbError("TX_FAILED", err instanceof Error ? err.message : String(err), err);
      }

      const txDb = wrapTx(driver, tx, options);
      try {
        const result = await fn(txDb);
        await tx.commit();
        return result;
      } catch (err) {
        try {
          await tx.rollback();
        } catch {
          // prefer original error
        }
        throw err;
      }
    },

    async close() {
      if (closed) return;
      closed = true;
      await driver.close();
    },
  };

  return db;
}
