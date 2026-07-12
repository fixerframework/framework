import type { CompiledQuery, DialectId, SqlFragment } from "./types.ts";
import { isSqlIdent, isSqlRaw } from "./sql.ts";
import { getCodec } from "../dialect/codecs.ts";
import { placeholder, quoteIdentPath } from "../dialect/quote.ts";
import { DbError } from "./errors.ts";

export interface CompileOptions {
  /** Encode values with the dialect codec (default true). */
  encodeParams?: boolean;
}

/**
 * Compile a SqlFragment into dialect-specific SQL text + bound values.
 */
export function compile(
  fragment: SqlFragment,
  dialect: DialectId,
  options: CompileOptions = {},
): CompiledQuery {
  const encode = options.encodeParams !== false;
  const codec = getCodec(dialect);

  let text = "";
  const values: unknown[] = [];
  let paramIndex = 0;

  const strings = fragment.strings;
  const fragValues = fragment.values;

  if (strings.length !== fragValues.length + 1) {
    throw new DbError(
      "COMPILE",
      `Invalid SQL fragment: expected ${fragValues.length + 1} strings, got ${strings.length}`,
    );
  }

  for (let i = 0; i < fragValues.length; i++) {
    text += strings[i] ?? "";
    const value = fragValues[i];

    if (isSqlRaw(value)) {
      text += value.text;
      continue;
    }

    if (isSqlIdent(value)) {
      text += quoteIdentPath(dialect, value.parts);
      continue;
    }

    // Nested fragments should already be flattened by sql`` — reject if present.
    if (
      typeof value === "object" &&
      value !== null &&
      (value as SqlFragment).__sql === true
    ) {
      throw new DbError(
        "COMPILE",
        "Nested sql fragments must be composed via sql`...` before compile",
      );
    }

    paramIndex += 1;
    text += placeholder(dialect, paramIndex);
    values.push(encode ? codec.encode(value) : value);
  }

  text += strings[fragValues.length] ?? "";

  return { text, values };
}
