import type { DbErrorCode } from "@fixerframework/types/db";

export type { DbErrorCode };

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
