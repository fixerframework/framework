/**
 * Deterministic serialization: object keys are sorted so
 * `{ a: 1, b: 2 }` and `{ b: 2, a: 1 }` produce the same string.
 *
 * Promoted from `@fixerframework/state` serialize-key so all packages share one impl.
 */
export function stableStringify(value: unknown): string {
  if (value === null) return "null";
  const t = typeof value;
  if (t === "string") return JSON.stringify(value);
  if (t === "number" || t === "boolean") return String(value);
  if (t === "undefined") return "undefined";
  if (t === "bigint") return `{"$bigint":"${value}"}`;
  if (t === "function" || t === "symbol") {
    throw new TypeError(`Cannot serialize ${t} values`);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (value instanceof Date) {
    return `{"$date":"${value.toISOString()}"}`;
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const parts = keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`);
    return `{${parts.join(",")}}`;
  }

  throw new TypeError(`Unsupported value: ${String(value)}`);
}
