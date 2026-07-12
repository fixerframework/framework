import type { CompiledQuery, Driver, DriverTx, QueryResult } from "../core/types.ts";
import { DbError } from "../core/errors.ts";
import type { D1PreparedStatement, D1Database, D1Config } from "@fixerframework/types/db/drivers";
export type { D1PreparedStatement, D1Database, D1Config };

/**
 * Structural Cloudflare D1 types (no hard dependency on workers types).
 */
function runQuery<T>(db: D1Database, compiled: CompiledQuery): Promise<QueryResult<T>> {
  const stmt = db.prepare(compiled.text).bind(...compiled.values);
  const isSelect = /^\s*(SELECT|WITH|PRAGMA|EXPLAIN)\b/i.test(compiled.text);

  return (async () => {
    try {
      if (isSelect) {
        const res = await stmt.all<T>();
        const rows = res.results ?? [];
        return { rows, rowCount: rows.length };
      }
      const res = await stmt.run();
      return { rows: [] as T[], rowCount: res.meta?.changes ?? 0 };
    } catch (err) {
      throw new DbError("QUERY_FAILED", err instanceof Error ? err.message : String(err), err);
    }
  })();
}

/**
 * Cloudflare D1 driver. Pass the D1 binding from the Worker environment.
 */
export function d1(config: D1Config): Driver {
  const db = config.database;

  return {
    dialect: "sqlite",
    quirks: ["d1", "cloudflare"],
    async execute<T = Record<string, unknown>>(compiled: CompiledQuery) {
      return runQuery<T>(db, compiled);
    },
    async begin(): Promise<DriverTx> {
      // D1 supports batch for atomic multi-statement; interactive BEGIN is limited.
      // Use session-style BEGIN when available.
      await runQuery(db, { text: "BEGIN", values: [] });
      let finished = false;
      return {
        async execute<T>(compiled: CompiledQuery) {
          return runQuery<T>(db, compiled);
        },
        async commit() {
          if (finished) return;
          finished = true;
          await runQuery(db, { text: "COMMIT", values: [] });
        },
        async rollback() {
          if (finished) return;
          finished = true;
          await runQuery(db, { text: "ROLLBACK", values: [] });
        },
      };
    },
    async close() {
      /* binding-owned */
    },
  };
}
