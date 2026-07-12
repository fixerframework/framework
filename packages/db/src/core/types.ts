/**
 * Core contracts for @fixerframework/db.
 */

/** Dialect family id used by the SQL compiler and type codecs. */
export type DialectId = "postgres" | "mysql" | "sqlite" | "mssql";

/** Opaque SQL fragment from `sql\`...\`` or helpers. */
export interface SqlFragment {
  readonly __sql: true;
  readonly strings: readonly string[];
  readonly values: readonly unknown[];
}

/** Trusted raw SQL (never parameterized). */
export interface SqlRaw {
  readonly __sqlRaw: true;
  readonly text: string;
}

/** Identifier to be dialect-quoted at compile time. */
export interface SqlIdent {
  readonly __sqlIdent: true;
  readonly parts: readonly string[];
}

export interface CompiledQuery {
  /** SQL text with dialect placeholders. */
  text: string;
  /** Driver-ready encoded parameter values. */
  values: unknown[];
}

export interface FieldInfo {
  name: string;
  dataTypeId?: number;
  dataTypeName?: string;
}

export interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number;
  fields?: FieldInfo[];
}

export interface DriverTx {
  execute<T = Record<string, unknown>>(compiled: CompiledQuery): Promise<QueryResult<T>>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export interface Driver {
  readonly dialect: DialectId;
  /** Optional driver-specific quirks (cockroach, planetscale, …). */
  readonly quirks?: string[];
  execute<T = Record<string, unknown>>(compiled: CompiledQuery): Promise<QueryResult<T>>;
  begin(): Promise<DriverTx>;
  close(): Promise<void>;
}

export interface Database {
  readonly dialect: DialectId;
  query<T = Record<string, unknown>>(fragment: SqlFragment): Promise<T[]>;
  execute(fragment: SqlFragment): Promise<{ rowCount: number }>;
  transaction<T>(fn: (tx: Database) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export interface CreateDbOptions {
  /**
   * When true (default), encode JS values with the dialect type codec
   * before sending to the driver.
   */
  encodeParams?: boolean;
}
