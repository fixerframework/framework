/**
 * Object comparison and manipulation helpers.
 */

/** Shallow structural equality — same keys with `Object.is` values. */
export function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || a === null || typeof b !== "object" || b === null) {
    return false;
  }
  const objA = a as Record<string, unknown>;
  const objB = b as Record<string, unknown>;
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.is(objA[key], objB[key])) return false;
  }
  return true;
}

/**
 * Recursively merge plain objects. Later sources win on conflicts.
 * Arrays and non-plain objects are replaced, not deep-merged.
 */
export function deepMerge<T extends Record<string, unknown>>(...sources: T[]): T {
  const result: Record<string, unknown> = {};
  for (const source of sources) {
    if (!isPlainRecord(source)) continue;
    for (const key of Object.keys(source)) {
      const prev = result[key];
      const next = source[key];
      if (isPlainRecord(prev) && isPlainRecord(next)) {
        result[key] = deepMerge(prev, next);
      } else {
        result[key] = next;
      }
    }
  }
  return result as T;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}
