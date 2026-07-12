import type { SqlFragment, SqlIdent, SqlRaw } from "./types.ts";

function isFragment(v: unknown): v is SqlFragment {
  return (
    typeof v === "object" &&
    v !== null &&
    (v as SqlFragment).__sql === true &&
    Array.isArray((v as SqlFragment).strings)
  );
}

function isRaw(v: unknown): v is SqlRaw {
  return typeof v === "object" && v !== null && (v as SqlRaw).__sqlRaw === true;
}

function isIdent(v: unknown): v is SqlIdent {
  return typeof v === "object" && v !== null && (v as SqlIdent).__sqlIdent === true;
}

export function isSqlFragment(v: unknown): v is SqlFragment {
  return isFragment(v);
}

export function isSqlRaw(v: unknown): v is SqlRaw {
  return isRaw(v);
}

export function isSqlIdent(v: unknown): v is SqlIdent {
  return isIdent(v);
}

/**
 * Build a parameterized SQL fragment.
 *
 * Nested `sql` fragments, `sql.raw`, and `sql.id` are composed in place.
 * All other values become bound parameters.
 */
export function sql(
  strings: TemplateStringsArray,
  ...values: unknown[]
): SqlFragment {
  const outStrings: string[] = [strings[0] ?? ""];
  const outValues: unknown[] = [];

  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    const nextLiteral = strings[i + 1] ?? "";

    if (isFragment(value)) {
      // Merge nested fragment into surrounding strings.
      const first = outStrings[outStrings.length - 1] ?? "";
      outStrings[outStrings.length - 1] = first + (value.strings[0] ?? "");
      for (let j = 0; j < value.values.length; j++) {
        outValues.push(value.values[j]);
        outStrings.push(value.strings[j + 1] ?? "");
      }
      outStrings[outStrings.length - 1] =
        (outStrings[outStrings.length - 1] ?? "") + nextLiteral;
    } else {
      outValues.push(value);
      outStrings.push(nextLiteral);
    }
  }

  return {
    __sql: true,
    strings: outStrings,
    values: outValues,
  };
}

sql.raw = (text: string): SqlRaw => ({
  __sqlRaw: true,
  text,
});

/**
 * Dialect-quoted identifier. Parts are joined with `.` after quoting each segment.
 * Example: `sql.id("public", "users")` → `"public"."users"` (postgres).
 */
sql.id = (...parts: string[]): SqlIdent => ({
  __sqlIdent: true,
  parts,
});

/** Alias for `sql.id`. */
sql.ident = sql.id;

/**
 * Join fragments/values with a separator (default `", "`).
 * Useful for `IN (...)` lists and multi-column inserts.
 */
sql.join = (
  items: readonly unknown[],
  separator: string | SqlFragment = ", ",
): SqlFragment => {
  if (items.length === 0) {
    return sql.empty;
  }

  const sepFragment: SqlFragment =
    typeof separator === "string"
      ? { __sql: true, strings: [separator], values: [] }
      : separator;

  let result: SqlFragment = toFragment(items[0]);
  for (let i = 1; i < items.length; i++) {
    result = sql`${result}${sepFragment}${toFragment(items[i])}`;
  }
  return result;
};

sql.empty = { __sql: true, strings: [""], values: [] } satisfies SqlFragment;

function toFragment(value: unknown): SqlFragment {
  if (isFragment(value)) return value;
  // Wrap scalar / raw / ident as a single-value fragment.
  return {
    __sql: true,
    strings: ["", ""],
    values: [value],
  };
}
