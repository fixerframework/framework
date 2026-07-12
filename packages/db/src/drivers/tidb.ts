import type { Driver } from "../core/types.ts";
import { mysql, type MysqlConfig } from "./mysql2.ts";

export type TidbConfig = MysqlConfig;

/**
 * TiDB is MySQL-compatible. Factory is an alias over `mysql` with a tidb quirk tag.
 */
export async function tidb(config: TidbConfig = {}): Promise<Driver> {
  return mysql({
    ...config,
    quirks: [...(config.quirks ?? []), "tidb"],
  });
}
