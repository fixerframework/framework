import { defineLibConfig } from "@fixerframework/bundler/vite/lib";

export default defineLibConfig({
  entry: {
    index: "./index.ts",
    postgres: "./postgres.ts",
    neon: "./neon.ts",
    mysql: "./mysql.ts",
    planetscale: "./planetscale.ts",
    sqlite: "./sqlite.ts",
    "bun-sqlite": "./bun-sqlite.ts",
    libsql: "./libsql.ts",
    d1: "./d1.ts",
    mssql: "./mssql.ts",
    "rds-data": "./rds-data.ts",
    cockroach: "./cockroach.ts",
    tidb: "./tidb.ts",
  },
});
