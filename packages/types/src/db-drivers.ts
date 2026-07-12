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
  ) => Promise<{
    rows: unknown[];
    rowCount: number | null;
    fields?: { name: string; dataTypeID?: number }[];
  }>;
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

export type CockroachConfig = PostgresConfig;

export interface MysqlConfig {
  uri?: string;
  host?: string;
  user?: string;
  password?: string;
  database?: string;
  port?: number;
  pool?: MysqlPoolLike;
  quirks?: string[];
}

export interface MysqlPoolLike {
  execute: (
    sql: string,
    values?: unknown[],
  ) => Promise<[unknown[] | { affectedRows?: number }, unknown]>;
  getConnection?: () => Promise<MysqlConnectionLike>;
  end?: () => Promise<void>;
}

export interface MysqlConnectionLike {
  execute: MysqlPoolLike["execute"];
  beginTransaction?: () => Promise<void>;
  commit?: () => Promise<void>;
  rollback?: () => Promise<void>;
  release?: () => void;
}

export type TidbConfig = MysqlConfig;

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

export interface D1PreparedStatement {
  bind: (...values: unknown[]) => D1PreparedStatement;
  all: <T = Record<string, unknown>>() => Promise<{ results: T[]; meta?: { changes?: number } }>;
  run: () => Promise<{ meta?: { changes?: number } }>;
}

export interface D1Database {
  prepare: (query: string) => D1PreparedStatement;
  batch?: <T = unknown>(statements: D1PreparedStatement[]) => Promise<T[]>;
}

export interface D1Config {
  /** D1 binding from the Worker env. */
  database: D1Database;
}

export interface MssqlConfig {
  connectionString?: string;
  server?: string;
  database?: string;
  user?: string;
  password?: string;
  options?: Record<string, unknown>;
  pool?: MssqlPoolLike;
}

export interface MssqlPoolLike {
  request: () => MssqlRequestLike;
  connect?: () => Promise<MssqlPoolLike>;
  close?: () => Promise<void>;
  transaction?: () => MssqlTransactionLike;
}

export interface MssqlRequestLike {
  input: (name: string, value: unknown) => MssqlRequestLike;
  query: (text: string) => Promise<{ recordset?: unknown[]; rowsAffected?: number[] }>;
}

export interface MssqlTransactionLike {
  begin: () => Promise<void>;
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
  request: () => MssqlRequestLike;
}

export interface NeonConfig {
  connectionString: string;
  /** Existing neon query function. */
  sql?: NeonSql;
}

export type NeonSql = ((
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<unknown[]>) & {
  query?: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
  transaction?: <T>(fn: (sql: NeonSql) => Promise<T>) => Promise<T>;
};

export interface PlanetscaleConfig {
  host?: string;
  username?: string;
  password?: string;
  url?: string;
  connection?: PlanetscaleConnection;
}

export interface PlanetscaleConnection {
  execute: (
    query: string,
    args?: unknown[],
  ) => Promise<{ rows: unknown[]; rowsAffected?: number }>;
  transaction?: <T>(fn: (tx: PlanetscaleConnection) => Promise<T>) => Promise<T>;
}

export interface RdsDataConfig {
  resourceArn: string;
  secretArn: string;
  database?: string;
  /** Engine family for placeholder compilation. */
  dialect?: "postgres" | "mysql";
  region?: string;
  client?: RdsDataClientLike;
}

export interface RdsDataClientLike {
  send: (command: unknown) => Promise<{
    records?: unknown[][];
    columnMetadata?: { name?: string }[];
    numberOfRecordsUpdated?: number;
    formattedRecords?: string;
  }>;
}
