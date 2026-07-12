import type { CompiledQuery, Driver, DriverTx, QueryResult } from "../core/types.ts";
import { DbError } from "../core/errors.ts";
import { importPeer } from "../internal/assert-peer.ts";
import type { MssqlConfig, MssqlPoolLike, MssqlRequestLike, MssqlTransactionLike } from "@fixerframework/types/db/drivers";
export type { MssqlConfig, MssqlPoolLike, MssqlRequestLike, MssqlTransactionLike };

type MssqlModule = {
  connect: (config: object) => Promise<MssqlPoolLike>;
  // default export shape varies
  default?: { connect: (config: object) => Promise<MssqlPoolLike> };
};

async function loadMssql(): Promise<{ connect: (config: object) => Promise<MssqlPoolLike> }> {
  const mod = await importPeer<MssqlModule>("mssql", "bun add mssql");
  if (typeof mod.connect === "function") return { connect: mod.connect };
  if (mod.default && typeof mod.default.connect === "function") {
    return { connect: mod.default.connect };
  }
  throw new DbError("PEER_MISSING", "mssql package does not export connect()");
}

function bindRequest(req: MssqlRequestLike, values: unknown[]): MssqlRequestLike {
  let r = req;
  for (let i = 0; i < values.length; i++) {
    r = r.input(`p${i + 1}`, values[i]);
  }
  return r;
}

/**
 * Microsoft SQL Server / Azure SQL driver via `mssql` (tedious).
 */
export async function mssql(config: MssqlConfig = {}): Promise<Driver> {
  let pool: MssqlPoolLike;
  let owns = false;

  if (config.pool) {
    pool = config.pool;
  } else {
    const { connect } = await loadMssql();
    const cfg = config.connectionString
      ? config.connectionString
      : {
          server: config.server,
          database: config.database,
          user: config.user,
          password: config.password,
          options: config.options,
        };
    pool = await connect(cfg as object);
    owns = true;
  }

  const execute = async <T>(compiled: CompiledQuery): Promise<QueryResult<T>> => {
    try {
      const req = bindRequest(pool.request(), compiled.values);
      const res = await req.query(compiled.text);
      const rows = (res.recordset ?? []) as T[];
      const affected = res.rowsAffected?.[0] ?? rows.length;
      return { rows, rowCount: affected };
    } catch (err) {
      throw new DbError("QUERY_FAILED", err instanceof Error ? err.message : String(err), err);
    }
  };

  return {
    dialect: "mssql",
    quirks: ["mssql", "tedious"],
    execute,
    async begin(): Promise<DriverTx> {
      if (!pool.transaction) {
        throw new DbError("TX_UNSUPPORTED", "mssql pool does not support transaction()");
      }
      const tx = pool.transaction();
      await tx.begin();
      let finished = false;
      return {
        async execute<T>(compiled: CompiledQuery) {
          try {
            const req = bindRequest(tx.request(), compiled.values);
            const res = await req.query(compiled.text);
            const rows = (res.recordset ?? []) as T[];
            return { rows, rowCount: res.rowsAffected?.[0] ?? rows.length };
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
          await tx.commit();
        },
        async rollback() {
          if (finished) return;
          finished = true;
          await tx.rollback();
        },
      };
    },
    async close() {
      if (owns && pool.close) await pool.close();
    },
  };
}
