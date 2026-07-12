import type { Driver } from "../core/types.ts";
import type { CockroachConfig } from "@fixerframework/types/db/drivers";
import { postgres } from "./postgres.ts";

export type { CockroachConfig };

/**
 * CockroachDB uses the PostgreSQL wire protocol and dialect.
 * Factory is an alias over `postgres` with a cockroach quirk tag.
 */
export async function cockroach(config: CockroachConfig = {}): Promise<Driver> {
  const driver = await postgres({
    ...config,
    quirks: [...(config.quirks ?? []), "cockroach"],
  });
  return driver;
}
