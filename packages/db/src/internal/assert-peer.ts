import { DbError } from "../core/errors.ts";

/**
 * Dynamically import an optional peer dependency.
 * Throws PEER_MISSING with install guidance when unavailable.
 */
export async function importPeer<T = unknown>(
  packageName: string,
  installHint?: string,
): Promise<T> {
  try {
    return (await import(/* @vite-ignore */ packageName)) as T;
  } catch (err) {
    const hint = installHint ?? `bun add ${packageName}`;
    throw new DbError(
      "PEER_MISSING",
      `Optional peer dependency "${packageName}" is not installed. Install it with: ${hint}`,
      err,
    );
  }
}

/**
 * Try to import the first available peer from a list.
 */
export async function importFirstPeer<T = unknown>(
  packages: readonly { name: string; hint?: string }[],
): Promise<{ name: string; mod: T }> {
  const errors: unknown[] = [];
  for (const p of packages) {
    try {
      const mod = await importPeer<T>(p.name, p.hint);
      return { name: p.name, mod };
    } catch (err) {
      errors.push(err);
    }
  }
  const names = packages.map((p) => p.name).join(" or ");
  throw new DbError(
    "PEER_MISSING",
    `None of the optional peers are installed: ${names}. Install one to use this driver.`,
    errors[errors.length - 1],
  );
}
