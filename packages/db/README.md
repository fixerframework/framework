# `@fixerframework/db`

SQL-only multi-platform database client for FixerFramework.

- Typed `sql\`...\`` templates with bound parameters
- Transactions
- Broad dialect support: **PostgreSQL**, **MySQL/MariaDB**, **SQLite**, **MSSQL**
- Drivers for Node, Bun, Workers, and serverless HTTP targets

**Not supported:** CQL, MongoDB, DynamoDB, Redis, or other non-SQL stores.

## Install

```bash
bun add @fixerframework/db
# plus the driver peer you need, e.g.:
bun add pg
# or run under Bun for built-in SQLite:
# @fixerframework/db/bun-sqlite (no peer)
```

## Quick start (Bun SQLite)

```ts
import { createDb, sql } from "@fixerframework/db";
import { bunSqlite } from "@fixerframework/db/bun-sqlite";

const db = createDb(await bunSqlite({ path: ":memory:" }));

await db.execute(sql`
  CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT NOT NULL)
`);

await db.execute(sql`INSERT INTO users (id, email) VALUES (${1}, ${"a@example.com"})`);

const users = await db.query<{ id: number; email: string }>(
  sql`SELECT id, email FROM users WHERE id = ${1}`,
);
```

## PostgreSQL

```ts
import { createDb, sql } from "@fixerframework/db";
import { postgres } from "@fixerframework/db/postgres";

const db = createDb(await postgres({ connectionString: process.env.DATABASE_URL! }));

const rows = await db.query<{ id: string }>(sql`
  SELECT id FROM accounts WHERE active = ${true}
`);
```

Requires peer `pg` (preferred) or `postgres` (postgres.js).

## Transactions

```ts
await db.transaction(async (tx) => {
  await tx.execute(sql`UPDATE accounts SET balance = balance - ${10} WHERE id = ${from}`);
  await tx.execute(sql`UPDATE accounts SET balance = balance + ${10} WHERE id = ${to}`);
});
```

Some serverless HTTP drivers throw `DbError` with code `TX_UNSUPPORTED` for interactive transactions (Neon HTTP, PlanetScale HTTP). Use session/pooler modes or the vendor’s own batch/transaction API when needed.

## Drivers

| Import | Dialect | Peer / runtime |
| ------ | ------- | -------------- |
| `@fixerframework/db/postgres` | postgres | `pg` or `postgres` |
| `@fixerframework/db/neon` | postgres | `@neondatabase/serverless` |
| `@fixerframework/db/cockroach` | postgres | same as postgres |
| `@fixerframework/db/mysql` | mysql | `mysql2` |
| `@fixerframework/db/tidb` | mysql | `mysql2` |
| `@fixerframework/db/planetscale` | mysql | `@planetscale/database` |
| `@fixerframework/db/sqlite` | sqlite | `better-sqlite3` |
| `@fixerframework/db/bun-sqlite` | sqlite | Bun builtin |
| `@fixerframework/db/libsql` | sqlite | `@libsql/client` |
| `@fixerframework/db/d1` | sqlite | Cloudflare D1 binding |
| `@fixerframework/db/mssql` | mssql | `mssql` |
| `@fixerframework/db/rds-data` | postgres or mysql | `@aws-sdk/client-rds-data` |

### Cloudflare D1

```ts
import { createDb, sql } from "@fixerframework/db";
import { d1 } from "@fixerframework/db/d1";

export default {
  async fetch(request: Request, env: { DB: D1Database }) {
    const db = createDb(d1({ database: env.DB }));
    const rows = await db.query(sql`SELECT * FROM items LIMIT ${10}`);
    return Response.json(rows);
  },
};
```

## SQL helpers

| Helper | Purpose |
| ------ | ------- |
| `sql\`...\`` | Parameterized fragment |
| `sql.raw(text)` | Trusted raw SQL |
| `sql.id(...parts)` | Dialect-quoted identifier |
| `sql.join(items, sep?)` | Join params/fragments |
| `sql.empty` | Empty fragment |

Values are always bound parameters (never string-interpolated), except `sql.raw` and identifiers.

## Type encoding

Parameters are encoded per dialect (e.g. SQLite booleans → `0`/`1`, JSON → string, dates → ISO or `Date`). Row TypeScript types are supplied at the call site:

```ts
type User = { id: string; email: string; createdAt: Date };
const users = await db.query<User>(sql`SELECT id, email, created_at AS "createdAt" FROM users`);
```

## Errors

`DbError` with stable `code`:

- `QUERY_FAILED`, `TX_UNSUPPORTED`, `TX_FAILED`, `PEER_MISSING`, `CONNECTION`, `COMPILE`, `CODEC`, `CLOSED`

## See also

- [DESIGN.md](./DESIGN.md) — architecture and dialect matrix
