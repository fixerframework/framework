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

export class DbError extends Error {
  readonly code: DbErrorCode;
  override readonly cause?: unknown;

  constructor(code: DbErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "DbError";
    this.code = code;
    this.cause = cause;
  }
}

export function isDbError(err: unknown): err is DbError {
  return err instanceof DbError;
}
