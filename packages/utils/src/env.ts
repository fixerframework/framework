/**
 * Runtime environment detection.
 * Values are computed once at module load.
 */

/** True when a DOM is available (browser). */
export const isBrowser: boolean =
  typeof window !== "undefined" &&
  typeof window.document !== "undefined";

/** True in a Node.js or Bun process (not a browser). */
export const isServer: boolean = (() => {
  if (isBrowser) return false;
  const p = (globalThis as { process?: { versions?: Record<string, string> } }).process;
  return typeof p?.versions === "object" && p.versions !== null && "node" in p.versions;
})();
