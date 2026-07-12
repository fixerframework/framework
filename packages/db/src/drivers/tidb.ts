import type { Driver } from "../core/types.ts";
import type { TidbConfig } from "@fixerframework/types/db/drivers";
import { mysql } from "./mysql2.ts";

export type { TidbConfig };

/**
 * TiDB is MySQL-compatible. Factory is an alias over `mysql` with a tidb quirk tag.
 */
export async function tidb(config: TidbConfig = {}): Promise<Driver> {
  return mysql({
    ...config,
    quirks: [...(config.quirks ?? []), "tidb"],
  });
}
