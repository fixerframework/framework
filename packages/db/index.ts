/**
 * @fixerframework/db — SQL-only multi-platform database client
 *
 * Typed `sql` templates, transactions, and drivers for PostgreSQL, MySQL,
 * SQLite, MSSQL, and serverless targets (Neon, D1, PlanetScale, Turso, RDS Data API).
 *
 * ```ts
 * import { createDb, sql } from "@fixerframework/db";
 * import { bunSqlite } from "@fixerframework/db/bun-sqlite";
 *
 * const db = createDb(await bunSqlite({ path: ":memory:" }));
 * const rows = await db.query<{ id: number }>(sql`SELECT 1 AS id`);
 * ```
 *
 * Non-goals: CQL, MongoDB, DynamoDB, Redis, or other non-SQL stores.
 */

export { sql, isSqlFragment, isSqlRaw, isSqlIdent } from "./src/core/sql.ts";
export { createDb } from "./src/core/create-db.ts";
export { compile } from "./src/core/compile.ts";
export { DbError, isDbError, type DbErrorCode } from "./src/core/errors.ts";
export { createMockDriver, type MockDriverOptions } from "./src/drivers/mock.ts";
export { getCodec, createCodec, type TypeCodec } from "./src/dialect/codecs.ts";
export { quoteIdent, quoteIdentPath, placeholder } from "./src/dialect/quote.ts";
export type { SqlTypeName } from "./src/dialect/ids.ts";

export type {
  DialectId,
  SqlFragment,
  SqlRaw,
  SqlIdent,
  CompiledQuery,
  QueryResult,
  FieldInfo,
  Driver,
  DriverTx,
  Database,
  CreateDbOptions,
} from "./src/core/types.ts";
