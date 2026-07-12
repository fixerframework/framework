import type { CompiledQuery, Driver, DriverTx, QueryResult } from "../core/types.ts";
import { DbError } from "../core/errors.ts";

export interface BunSqliteConfig {
  /** Path or `":memory:"`. Default: `":memory:"`. */
  path?: string;
  /**
   * Existing Bun Database instance. When set, `path` is ignored and
   * close() will not close the external instance.
   */
  database?: BunDatabase;
  /** Close the database on driver.close(). Default: true when path-created. */
  closeOnDisconnect?: boolean;
}

/** Structural subset of bun:sqlite Database. */
export interface BunDatabase {
  query(sql: string): {
    all: (...params: unknown[]) => unknown[];
    run: (...params: unknown[]) => { changes: number };
  };
  close(): void;
  exec?(sql: string): void;
}

async function loadBunSqlite(): Promise<{ Database: new (path: string) => BunDatabase }> {
  try {
    // Variable module id avoids TS resolving bun:sqlite during declaration emit.
    const moduleId: string = "bun:sqlite";
    const mod = (await import(/* @vite-ignore */ moduleId)) as {
      Database: new (path: string) => BunDatabase;
    };
    return mod;
  } catch (err) {
    throw new DbError(
      "PEER_MISSING",
      "bun:sqlite is only available when running under Bun",
      err,
    );
  }
}

function runQuery<T>(db: BunDatabase, compiled: CompiledQuery): QueryResult<T> {
  try {
    const stmt = db.query(compiled.text);
    // bun:sqlite: all() returns rows for SELECT; run for mutations
    const isSelect = /^\s*(SELECT|WITH|PRAGMA|EXPLAIN)\b/i.test(compiled.text);
    if (isSelect) {
      const rows = stmt.all(...compiled.values) as T[];
      return { rows, rowCount: rows.length };
    }
    const info = stmt.run(...compiled.values);
    return { rows: [] as T[], rowCount: info.changes ?? 0 };
  } catch (err) {
    throw new DbError("QUERY_FAILED", err instanceof Error ? err.message : String(err), err);
  }
}

/**
 * Bun built-in SQLite driver (`bun:sqlite`).
 * Async factory so `bun:sqlite` can be dynamically imported.
 */
export async function bunSqlite(config: BunSqliteConfig = {}): Promise<Driver> {
  const external = config.database;
  let db: BunDatabase;
  let owns = false;

  if (external) {
    db = external;
  } else {
    const { Database } = await loadBunSqlite();
    db = new Database(config.path ?? ":memory:");
    owns = config.closeOnDisconnect !== false;
  }

  return {
    dialect: "sqlite",
    quirks: ["bun-sqlite"],
    async execute<T = Record<string, unknown>>(compiled: CompiledQuery) {
      return runQuery<T>(db, compiled);
    },
    async begin(): Promise<DriverTx> {
      db.query("BEGIN").run();
      let finished = false;
      return {
        async execute<T = Record<string, unknown>>(compiled: CompiledQuery) {
          return runQuery<T>(db, compiled);
        },
        async commit() {
          if (finished) return;
          finished = true;
          db.query("COMMIT").run();
        },
        async rollback() {
          if (finished) return;
          finished = true;
          db.query("ROLLBACK").run();
        },
      };
    },
    async close() {
      if (owns) db.close();
    },
  };
}
