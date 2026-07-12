import type { CompiledQuery, DialectId, Driver, DriverTx, QueryResult } from "../core/types.ts";
import { DbError } from "../core/errors.ts";
import { importPeer } from "../internal/assert-peer.ts";

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

type AwsModule = {
  RDSDataClient: new (config: object) => RdsDataClientLike;
  ExecuteStatementCommand: new (input: object) => unknown;
  BeginTransactionCommand: new (input: object) => unknown;
  CommitTransactionCommand: new (input: object) => unknown;
  RollbackTransactionCommand: new (input: object) => unknown;
};

function toField(value: unknown): Record<string, unknown> {
  if (value === null || value === undefined) return { isNull: true };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    if (Number.isInteger(value)) return { longValue: value };
    return { doubleValue: value };
  }
  if (typeof value === "bigint") return { longValue: Number(value) };
  if (value instanceof Uint8Array) return { blobValue: value };
  if (typeof value === "object") return { stringValue: JSON.stringify(value) };
  return { stringValue: String(value) };
}

function fromField(field: Record<string, unknown>): unknown {
  if (field.isNull) return null;
  if ("stringValue" in field) return field.stringValue;
  if ("longValue" in field) return field.longValue;
  if ("doubleValue" in field) return field.doubleValue;
  if ("booleanValue" in field) return field.booleanValue;
  if ("blobValue" in field) return field.blobValue;
  return null;
}

/**
 * AWS RDS Data API driver (Aurora Serverless). Supports postgres or mysql dialect.
 */
export async function rdsData(config: RdsDataConfig): Promise<Driver> {
  const dialect: DialectId = config.dialect ?? "postgres";
  let client: RdsDataClientLike;
  let ExecuteStatementCommand: AwsModule["ExecuteStatementCommand"];
  let BeginTransactionCommand: AwsModule["BeginTransactionCommand"];
  let CommitTransactionCommand: AwsModule["CommitTransactionCommand"];
  let RollbackTransactionCommand: AwsModule["RollbackTransactionCommand"];

  if (config.client) {
    client = config.client;
    // Commands still needed for send payloads — load module for Command classes
    const mod = await importPeer<AwsModule>(
      "@aws-sdk/client-rds-data",
      "bun add @aws-sdk/client-rds-data",
    );
    ExecuteStatementCommand = mod.ExecuteStatementCommand;
    BeginTransactionCommand = mod.BeginTransactionCommand;
    CommitTransactionCommand = mod.CommitTransactionCommand;
    RollbackTransactionCommand = mod.RollbackTransactionCommand;
  } else {
    const mod = await importPeer<AwsModule>(
      "@aws-sdk/client-rds-data",
      "bun add @aws-sdk/client-rds-data",
    );
    client = new mod.RDSDataClient({ region: config.region });
    ExecuteStatementCommand = mod.ExecuteStatementCommand;
    BeginTransactionCommand = mod.BeginTransactionCommand;
    CommitTransactionCommand = mod.CommitTransactionCommand;
    RollbackTransactionCommand = mod.RollbackTransactionCommand;
  }

  const baseInput = {
    resourceArn: config.resourceArn,
    secretArn: config.secretArn,
    database: config.database,
  };

  const executeWithTx = async <T>(
    compiled: CompiledQuery,
    transactionId?: string,
  ): Promise<QueryResult<T>> => {
    try {
      const res = await client.send(
        new ExecuteStatementCommand({
          ...baseInput,
          sql: compiled.text,
          parameters: compiled.values.map((v) => toField(v)),
          transactionId,
          includeResultMetadata: true,
        }),
      );

      const names = res.columnMetadata?.map((c, i) => c.name ?? `column${i}`) ?? [];
      const rows = (res.records ?? []).map((record) => {
        const row: Record<string, unknown> = {};
        for (let i = 0; i < record.length; i++) {
          const key = names[i] ?? `column${i}`;
          row[key] = fromField(record[i] as Record<string, unknown>);
        }
        return row as T;
      });

      return {
        rows,
        rowCount: res.numberOfRecordsUpdated ?? rows.length,
      };
    } catch (err) {
      throw new DbError("QUERY_FAILED", err instanceof Error ? err.message : String(err), err);
    }
  };

  return {
    dialect,
    quirks: ["rds-data", "serverless-http"],
    async execute<T>(compiled: CompiledQuery) {
      return executeWithTx<T>(compiled);
    },
    async begin(): Promise<DriverTx> {
      try {
        const beginRes = (await client.send(new BeginTransactionCommand(baseInput))) as {
          transactionId?: string;
        };
        const transactionId = beginRes.transactionId;
        if (!transactionId) {
          throw new DbError("TX_FAILED", "RDS Data API did not return transactionId");
        }
        let finished = false;
        return {
          async execute<T>(compiled: CompiledQuery) {
            return executeWithTx<T>(compiled, transactionId);
          },
          async commit() {
            if (finished) return;
            finished = true;
            await client.send(
              new CommitTransactionCommand({ ...baseInput, transactionId }),
            );
          },
          async rollback() {
            if (finished) return;
            finished = true;
            await client.send(
              new RollbackTransactionCommand({ ...baseInput, transactionId }),
            );
          },
        };
      } catch (err) {
        if (err instanceof DbError) throw err;
        throw new DbError("TX_FAILED", err instanceof Error ? err.message : String(err), err);
      }
    },
    async close() {
      /* SDK client */
    },
  };
}
