import type { CompiledQuery, Driver, DriverTx, QueryResult } from "../core/types.ts";
import { DbError } from "../core/errors.ts";
import { importPeer } from "../internal/assert-peer.ts";
import type { NeonConfig, NeonSql } from "@fixerframework/types/db/drivers";
export type { NeonConfig, NeonSql };

type NeonModule = {
  neon: (url: string) => NeonSql;
};

/**
 * Neon serverless (HTTP) PostgreSQL driver.
 * Interactive transactions depend on the neon client; may throw TX_UNSUPPORTED.
 */
export async function neon(config: NeonConfig): Promise<Driver> {
  let sql: NeonSql;

  if (config.sql) {
    sql = config.sql;
  } else {
    const mod = await importPeer<NeonModule>(
      "@neondatabase/serverless",
      "bun add @neondatabase/serverless",
    );
    sql = mod.neon(config.connectionString);
  }

  const execute = async <T>(compiled: CompiledQuery): Promise<QueryResult<T>> => {
    try {
      if (sql.query) {
        const res = await sql.query(compiled.text, compiled.values);
        const rows = res.rows as T[];
        return { rows, rowCount: rows.length };
      }
      // Fallback: neon tagged template cannot take precompiled text easily
      throw new DbError(
        "QUERY_FAILED",
        "Neon client must expose .query(text, params) — use a recent @neondatabase/serverless",
      );
    } catch (err) {
      if (err instanceof DbError) throw err;
      throw new DbError("QUERY_FAILED", err instanceof Error ? err.message : String(err), err);
    }
  };

  return {
    dialect: "postgres",
    quirks: ["neon", "serverless-http"],
    execute,
    async begin(): Promise<DriverTx> {
      throw new DbError(
        "TX_UNSUPPORTED",
        "Interactive transactions are not supported on Neon HTTP in v1; use neon serverless transactions API or a session pooler",
      );
    },
    async close() {
      /* HTTP client — nothing to close */
    },
  };
}
