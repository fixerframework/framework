import type {
  CompiledQuery,
  DialectId,
  Driver,
  DriverTx,
  MockDriverOptions,
  QueryResult,
} from "../core/types.ts";
import { DbError } from "../core/errors.ts";

export type { MockDriverOptions };

/**
 * In-memory driver for unit tests.
 */
export function createMockDriver(options: MockDriverOptions = {}): Driver & {
  statements: CompiledQuery[];
} {
  const statements: CompiledQuery[] = [];
  const dialect = options.dialect ?? "sqlite";

  const execute = async <T = Record<string, unknown>>(
    compiled: CompiledQuery,
  ): Promise<QueryResult<T>> => {
    statements.push(compiled);
    if (options.onExecute) {
      return options.onExecute(compiled) as QueryResult<T> | Promise<QueryResult<T>>;
    }
    const key = compiled.text.trim();
    const rows = (options.results?.[key] ?? []) as T[];
    return { rows, rowCount: rows.length };
  };

  const driver: Driver & { statements: CompiledQuery[] } = {
    dialect,
    statements,
    execute,
    async begin(): Promise<DriverTx> {
      if (options.noTx) {
        throw new DbError("TX_UNSUPPORTED", "Mock driver configured without transactions");
      }
      const txStatements: CompiledQuery[] = [];
      return {
        async execute<T = Record<string, unknown>>(compiled: CompiledQuery) {
          txStatements.push(compiled);
          return execute<T>(compiled);
        },
        async commit() {
          /* no-op */
        },
        async rollback() {
          /* no-op */
        },
      };
    },
    async close() {
      /* no-op */
    },
  };

  return driver;
}
