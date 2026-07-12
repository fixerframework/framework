import { stableStringify } from "@fixerframework/utils";

/**
 * Produce a deterministic string for query-key tuples (arrays + plain objects).
 * Object keys are sorted so `{ a: 1, b: 2 }` and `{ b: 2, a: 1 }` collide.
 */
export function serializeKey(key: readonly unknown[]): string {
  return stableStringify(key);
}

/**
 * True when `entryKey` starts with every element of `prefix` (TanStack-style prefix match).
 */
export function keyMatchesPrefix(
  entryKey: readonly unknown[],
  prefix: readonly unknown[],
): boolean {
  if (prefix.length > entryKey.length) return false;
  for (let i = 0; i < prefix.length; i++) {
    if (serializeKey([entryKey[i]]) !== serializeKey([prefix[i]])) return false;
  }
  return true;
}
