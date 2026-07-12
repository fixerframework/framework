import type { CompiledQuery, Driver, DriverTx, QueryResult } from "../core/types.ts";
import { DbError } from "../core/errors.ts";
import { importFirstPeer, importPeer } from "../internal/assert-peer.ts";

export interface PostgresConfig {
  connectionString?: string;
  /** Prefer `pg` (node-postgres) or `postgres` (postgres.js). Default: auto. */
  client?: "pg" | "postgres";
  /** Existing pg Pool or Client. */
  pool?: PgPoolLike;
  /** Existing postgres.js sql instance. */
  sql?: PostgresJsSql;
  /** Quirk tags (e.g. cockroach). */
  quirks?: string[];
}

export interface PgPoolLike {
  query: (
    text: string,
    values?: unknown[],
  ) => Promise<{ rows: unknown[]; rowCount: number | null; fields?: { name: string; dataTypeID?: number }[] }>;
  connect?: () => Promise<PgClientLike>;
  end?: () => Promise<void>;
}

export interface PgClientLike {
  query: PgPoolLike["query"];
  release?: () => void;
  end?: () => Promise<void>;
}

export type PostgresJsSql = ((
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<unknown[]>) & {
  begin?: <T>(fn: (sql: PostgresJsSql) => Promise<T>) => Promise<T>;
  end?: (options?: { timeout?: number }) => Promise<void>;
  unsafe?: (query: string, params?: unknown[]) => Promise<unknown[]>;
};

async function createPgDriver(config: PostgresConfig): Promise<Driver> {
  let pool: PgPoolLike;
  let owns = false;

  if (config.pool) {
    pool = config.pool;
  } else {
    const mod = await importPeer<{ default: new (cfg: object) => PgPoolLike } | { Pool: new (cfg: object) => PgPoolLike }>(
      "pg",
      "bun add pg",
    );
    const Pool =
      "Pool" in mod && typeof mod.Pool === "function"
        ? mod.Pool
        : (mod as { default: new (cfg: object) => PgPoolLike }).default;
    if (!config.connectionString) {
      throw new DbError("CONNECTION", "postgres driver requires connectionString or pool");
    }
    pool = new Pool({ connectionString: config.connectionString });
    owns = true;
  }

  const execute = async <T>(compiled: CompiledQuery): Promise<QueryResult<T>> => {
    try {
      const res = await pool.query(compiled.text, compiled.values);
      return {
        rows: res.rows as T[],
        rowCount: res.rowCount ?? res.rows.length,
        fields: res.fields?.map((f) => ({
          name: f.name,
          dataTypeId: f.dataTypeID,
        })),
      };
    } catch (err) {
      throw new DbError("QUERY_FAILED", err instanceof Error ? err.message : String(err), err);
    }
  };

  return {
    dialect: "postgres",
    quirks: config.quirks,
    execute,
    async begin(): Promise<DriverTx> {
      if (!pool.connect) {
        throw new DbError(
          "TX_UNSUPPORTED",
          "pg Pool/Client does not support connect() for transactions",
        );
      }
      const client = await pool.connect();
      await client.query("BEGIN");
      let finished = false;
      return {
        async execute<T>(compiled: CompiledQuery) {
          try {
            const res = await client.query(compiled.text, compiled.values);
            return {
              rows: res.rows as T[],
              rowCount: res.rowCount ?? res.rows.length,
            };
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
            await client.query("COMMIT");
          } finally {
            client.release?.();
          }
        },
        async rollback() {
          if (finished) return;
          finished = true;
          try {
            await client.query("ROLLBACK");
          } finally {
            client.release?.();
          }
        },
      };
    },
    async close() {
      if (owns && pool.end) await pool.end();
    },
  };
}

async function createPostgresJsDriver(config: PostgresConfig): Promise<Driver> {
  let sql: PostgresJsSql;
  let owns = false;

  if (config.sql) {
    sql = config.sql;
  } else {
    const mod = await importPeer<{ default: (url: string) => PostgresJsSql }>(
      "postgres",
      "bun add postgres",
    );
    if (!config.connectionString) {
      throw new DbError("CONNECTION", "postgres.js driver requires connectionString or sql");
    }
    sql = mod.default(config.connectionString);
    owns = true;
  }

  const execute = async <T>(compiled: CompiledQuery): Promise<QueryResult<T>> => {
    try {
      if (!sql.unsafe) {
        throw new DbError("QUERY_FAILED", "postgres.js client missing unsafe()");
      }
      const rows = (await sql.unsafe(compiled.text, compiled.values)) as T[];
      return { rows, rowCount: rows.length };
    } catch (err) {
      if (err instanceof DbError) throw err;
      throw new DbError("QUERY_FAILED", err instanceof Error ? err.message : String(err), err);
    }
  };

  return {
    dialect: "postgres",
    quirks: [...(config.quirks ?? []), "postgres.js"],
    execute,
    async begin(): Promise<DriverTx> {
      if (!sql.begin) {
        throw new DbError("TX_UNSUPPORTED", "postgres.js client does not support begin()");
      }
      // postgres.js uses callback-style transactions; we emulate DriverTx with a queue
      throw new DbError(
        "TX_UNSUPPORTED",
        "Interactive DriverTx is not supported with postgres.js in v1; use createDb(postgres({ client: 'pg' })) for transactions, or sql.begin from postgres.js directly",
      );
    },
    async close() {
      if (owns && sql.end) await sql.end({ timeout: 5 });
    },
  };
}

/**
 * PostgreSQL driver via `pg` (default) or `postgres` (postgres.js).
 */
export async function postgres(config: PostgresConfig = {}): Promise<Driver> {
  if (config.pool) return createPgDriver(config);
  if (config.sql) return createPostgresJsDriver(config);

  if (config.client === "postgres") return createPostgresJsDriver(config);
  if (config.client === "pg") return createPgDriver(config);

  // Auto: prefer pg, fall back to postgres.js
  try {
    await importPeer("pg", "bun add pg");
    return createPgDriver(config);
  } catch {
    await importFirstPeer([{ name: "postgres", hint: "bun add postgres" }]);
    return createPostgresJsDriver(config);
  }
}
