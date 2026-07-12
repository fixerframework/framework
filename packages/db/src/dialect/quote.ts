import type { DialectId } from "../core/types.ts";
import { DbError } from "../core/errors.ts";

/** Quote a single identifier segment for the dialect. */
export function quoteIdent(dialect: DialectId, part: string): string {
  if (!part) {
    throw new DbError("COMPILE", "Empty identifier segment");
  }
  // Reject null bytes and dangerous control characters
  if (/[\0\n\r]/.test(part)) {
    throw new DbError("COMPILE", "Invalid identifier characters");
  }

  switch (dialect) {
    case "postgres":
    case "sqlite":
      return `"${part.replace(/"/g, '""')}"`;
    case "mysql":
      return `\`${part.replace(/`/g, "``")}\``;
    case "mssql":
      return `[${part.replace(/]/g, "]]")}]`;
  }
}

export function quoteIdentPath(dialect: DialectId, parts: readonly string[]): string {
  return parts.map((p) => quoteIdent(dialect, p)).join(".");
}

/** Placeholder for the n-th parameter (1-based). */
export function placeholder(dialect: DialectId, index: number): string {
  switch (dialect) {
    case "postgres":
      return `$${index}`;
    case "mysql":
    case "sqlite":
      return "?";
    case "mssql":
      return `@p${index}`;
  }
}
