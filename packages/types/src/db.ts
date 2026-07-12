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

/** Stable error codes for @fixerframework/db. */
export type DbErrorCode =
  | "QUERY_FAILED"
  | "TX_UNSUPPORTED"
  | "TX_FAILED"
  | "PEER_MISSING"
  | "CONNECTION"
  | "COMPILE"
  | "CODEC"
  | "CLOSED";

/** Logical SQL types supported by the type catalog. */
export type SqlTypeName =
  | "boolean"
  | "int2"
  | "int4"
  | "int8"
  | "float4"
  | "float8"
  | "numeric"
  | "text"
  | "varchar"
  | "char"
  | "bytea"
  | "blob"
  | "date"
  | "time"
  | "timestamp"
  | "timestamptz"
  | "json"
  | "jsonb"
  | "uuid"
  | "array"
  | "enum"
  | "inet"
  | "cidr"
  | "interval"
  | "xml"
  | "null";

export interface TypeCodec {
  /** Encode a JS value for wire/driver binding. */
  encode(value: unknown, hint?: SqlTypeName): unknown;
  /** Decode a driver value into a convenient JS form (best-effort). */
  decode(value: unknown, hint?: SqlTypeName): unknown;
}

export interface MockDriverOptions {
  dialect?: DialectId;
  /** Map of SQL text (trimmed) → rows to return. */
  results?: Record<string, unknown[]>;
  /** Handler override for full control. */
  onExecute?: (compiled: CompiledQuery) => Promise<QueryResult> | QueryResult;
  /** When true, begin() throws TX_UNSUPPORTED. */
  noTx?: boolean;
}
