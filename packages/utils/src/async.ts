/**
 * Async primitives shared across packages and tests.
 */

export interface Deferred<T = void> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

/**
 * Create a controllable promise: resolve/reject from the outside.
 * Wraps `Promise.withResolvers` for named-access ergonomics.
 */
export function deferred<T = void>(): Deferred<T> {
  return Promise.withResolvers<T>();
}

/** Wait `ms` milliseconds. */
export function sleep(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, ms);
  return promise;
}

/** Reject with `Error(message)` if `promise` doesn't settle within `ms`. */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message = `Operation timed out after ${ms}ms`,
): Promise<T> {
  const { promise: timer, resolve } = Promise.withResolvers<true>();
  const id = setTimeout(() => resolve(true), ms);
  try {
    const winner = await Promise.race([
      promise.then((value) => ({ type: "result" as const, value })),
      timer.then(() => ({ type: "timeout" as const })),
    ]);
    if (winner.type === "timeout") throw new Error(message);
    return winner.value;
  } finally {
    clearTimeout(id);
  }
}
