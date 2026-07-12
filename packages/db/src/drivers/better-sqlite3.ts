import type { CompiledQuery, Driver, DriverTx, QueryResult } from "../core/types.ts";
import { DbError } from "../core/errors.ts";
import { importPeer } from "../internal/assert-peer.ts";

export interface SqliteConfig {
  path?: string;
  /** Existing better-sqlite3 Database instance. */
  database?: BetterSqliteDatabase;
  readonly?: boolean;
  closeOnDisconnect?: boolean;
}

export interface BetterSqliteDatabase {
  prepare(sql: string): {
    all: (...params: unknown[]) => unknown[];
    run: (...params: unknown[]) => { changes: number };
  };
  exec(sql: string): void;
  close(): void;
}

type BetterSqliteModule = {
  default: new (
    path: string,
    options?: { readonly?: boolean },
  ) => BetterSqliteDatabase;
};

function runQuery<T>(db: BetterSqliteDatabase, compiled: CompiledQuery): QueryResult<T> {
  try {
    const stmt = db.prepare(compiled.text);
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
 * Node `better-sqlite3` driver. Synchronous library wrapped in async Driver API.
 */
export async function sqlite(config: SqliteConfig = {}): Promise<Driver> {
  let db: BetterSqliteDatabase;
  let owns = false;

  if (config.database) {
    db = config.database;
  } else {
    const mod = await importPeer<BetterSqliteModule>("better-sqlite3", "bun add better-sqlite3");
    const Database = mod.default;
    db = new Database(config.path ?? ":memory:", { readonly: config.readonly });
    owns = config.closeOnDisconnect !== false;
  }

  return {
    dialect: "sqlite",
    quirks: ["better-sqlite3"],
    async execute<T = Record<string, unknown>>(compiled: CompiledQuery) {
      return runQuery<T>(db, compiled);
    },
    async begin(): Promise<DriverTx> {
      db.exec("BEGIN");
      let finished = false;
      return {
        async execute<T = Record<string, unknown>>(compiled: CompiledQuery) {
          return runQuery<T>(db, compiled);
        },
        async commit() {
          if (finished) return;
          finished = true;
          db.exec("COMMIT");
        },
        async rollback() {
          if (finished) return;
          finished = true;
          db.exec("ROLLBACK");
        },
      };
    },
    async close() {
      if (owns) db.close();
    },
  };
}
