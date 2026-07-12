import type { CompiledQuery, Driver, DriverTx, QueryResult } from "../core/types.ts";
import { DbError } from "../core/errors.ts";
import { importPeer } from "../internal/assert-peer.ts";
import type { PlanetscaleConfig, PlanetscaleConnection } from "@fixerframework/types/db/drivers";
export type { PlanetscaleConfig, PlanetscaleConnection };

type PlanetscaleModule = {
  connect: (config: object) => PlanetscaleConnection;
};

/**
 * PlanetScale serverless HTTP driver (MySQL dialect).
 */
export async function planetscale(config: PlanetscaleConfig = {}): Promise<Driver> {
  let conn: PlanetscaleConnection;

  if (config.connection) {
    conn = config.connection;
  } else {
    const mod = await importPeer<PlanetscaleModule>(
      "@planetscale/database",
      "bun add @planetscale/database",
    );
    conn = mod.connect({
      host: config.host,
      username: config.username,
      password: config.password,
      url: config.url,
    });
  }

  const execute = async <T>(compiled: CompiledQuery): Promise<QueryResult<T>> => {
    try {
      const res = await conn.execute(compiled.text, compiled.values);
      const rows = (res.rows ?? []) as T[];
      return {
        rows,
        rowCount: res.rowsAffected ?? rows.length,
      };
    } catch (err) {
      throw new DbError("QUERY_FAILED", err instanceof Error ? err.message : String(err), err);
    }
  };

  return {
    dialect: "mysql",
    quirks: ["planetscale", "serverless-http"],
    execute,
    async begin(): Promise<DriverTx> {
      throw new DbError(
        "TX_UNSUPPORTED",
        "Interactive DriverTx is not supported for PlanetScale HTTP in v1; use connection.transaction() from @planetscale/database for multi-statement tx",
      );
    },
    async close() {
      /* HTTP */
    },
  };
}
