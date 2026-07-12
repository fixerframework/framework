import type { CompiledQuery, Driver, DriverTx, QueryResult } from "../core/types.ts";
import { DbError } from "../core/errors.ts";
import { importPeer } from "../internal/assert-peer.ts";
import type { MysqlConfig, MysqlPoolLike, MysqlConnectionLike } from "@fixerframework/types/db/drivers";
export type { MysqlConfig, MysqlPoolLike, MysqlConnectionLike };

type Mysql2Module = {
  createPool: (config: object) => MysqlPoolLike;
};

function mapResult<T>(rows: unknown): QueryResult<T> {
  if (Array.isArray(rows)) {
    return { rows: rows as T[], rowCount: rows.length };
  }
  const affected =
    rows && typeof rows === "object" && "affectedRows" in rows
      ? Number((rows as { affectedRows?: number }).affectedRows ?? 0)
      : 0;
  return { rows: [] as T[], rowCount: affected };
}

/**
 * MySQL / MariaDB driver via mysql2/promise pool.
 */
export async function mysql(config: MysqlConfig = {}): Promise<Driver> {
  let pool: MysqlPoolLike;
  let owns = false;

  if (config.pool) {
    pool = config.pool;
  } else {
    const mod = await importPeer<Mysql2Module>("mysql2/promise", "bun add mysql2");
    const cfg = config.uri
      ? config.uri
      : {
          host: config.host,
          user: config.user,
          password: config.password,
          database: config.database,
          port: config.port,
        };
    pool = mod.createPool(cfg as object);
    owns = true;
  }

  const execute = async <T>(compiled: CompiledQuery): Promise<QueryResult<T>> => {
    try {
      const [rows] = await pool.execute(compiled.text, compiled.values);
      return mapResult<T>(rows);
    } catch (err) {
      throw new DbError("QUERY_FAILED", err instanceof Error ? err.message : String(err), err);
    }
  };

  return {
    dialect: "mysql",
    quirks: config.quirks,
    execute,
    async begin(): Promise<DriverTx> {
      if (!pool.getConnection) {
        throw new DbError("TX_UNSUPPORTED", "mysql pool does not support getConnection()");
      }
      const conn = await pool.getConnection();
      await conn.beginTransaction?.();
      let finished = false;
      return {
        async execute<T>(compiled: CompiledQuery) {
          try {
            const [rows] = await conn.execute(compiled.text, compiled.values);
            return mapResult<T>(rows);
          } catch (err) {
            throw new DbError(
              "QUERY_FAILED",
              err instanceof Error ? err.message : String(err),
              err,
            );
          }
        },
        async commit() {
          if (finished) return;
          finished = true;
          try {
            await conn.commit?.();
          } finally {
            conn.release?.();
          }
        },
        async rollback() {
          if (finished) return;
          finished = true;
          try {
            await conn.rollback?.();
          } finally {
            conn.release?.();
          }
        },
      };
    },
    async close() {
      if (owns && pool.end) await pool.end();
    },
  };
}
