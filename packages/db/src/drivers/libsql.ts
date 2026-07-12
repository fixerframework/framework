import type { CompiledQuery, Driver, DriverTx, QueryResult } from "../core/types.ts";
import { DbError } from "../core/errors.ts";
import { importPeer } from "../internal/assert-peer.ts";

export interface LibsqlConfig {
  url: string;
  authToken?: string;
  client?: LibsqlClient;
}

export interface LibsqlClient {
  execute: (stmt: {
    sql: string;
    args?: unknown[];
  }) => Promise<{ rows: unknown[]; rowsAffected?: number }>;
  batch?: (
    stmts: { sql: string; args?: unknown[] }[],
  ) => Promise<{ rows: unknown[]; rowsAffected?: number }[]>;
  close?: () => void;
}

type LibsqlModule = {
  createClient: (config: { url: string; authToken?: string }) => LibsqlClient;
};

/**
 * libSQL / Turso driver (`@libsql/client`).
 */
export async function libsql(config: LibsqlConfig): Promise<Driver> {
  let client: LibsqlClient;
  let owns = false;

  if (config.client) {
    client = config.client;
  } else {
    const mod = await importPeer<LibsqlModule>("@libsql/client", "bun add @libsql/client");
    client = mod.createClient({ url: config.url, authToken: config.authToken });
    owns = true;
  }

  const execute = async <T>(compiled: CompiledQuery): Promise<QueryResult<T>> => {
    try {
      const res = await client.execute({ sql: compiled.text, args: compiled.values });
      const rows = (res.rows ?? []) as T[];
      return { rows, rowCount: res.rowsAffected ?? rows.length };
    } catch (err) {
      throw new DbError("QUERY_FAILED", err instanceof Error ? err.message : String(err), err);
    }
  };

  return {
    dialect: "sqlite",
    quirks: ["libsql", "turso"],
    execute,
    async begin(): Promise<DriverTx> {
      // libSQL supports batch; interactive tx varies by remote vs local
      await client.execute({ sql: "BEGIN" });
      let finished = false;
      return {
        async execute<T>(compiled: CompiledQuery) {
          return execute<T>(compiled);
        },
        async commit() {
          if (finished) return;
          finished = true;
          await client.execute({ sql: "COMMIT" });
        },
        async rollback() {
          if (finished) return;
          finished = true;
          await client.execute({ sql: "ROLLBACK" });
        },
      };
    },
    async close() {
      if (owns) client.close?.();
    },
  };
}
