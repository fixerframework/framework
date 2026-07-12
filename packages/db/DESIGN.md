# `@fixerframework/db` — Design

## Goals

1. Own SQL-first client (no Kysely/Drizzle/Prisma dependency).
2. One API across SQL platforms: `createDb(driver)` → `query` / `execute` / `transaction`.
3. Typed `sql` templates + broad SQL type encode/decode per dialect family.
4. Maximum platform breadth via optional peer drivers and subpath exports.
5. SQL only — no CQL/NoSQL.

## Layers

| Layer | Responsibility |
| ----- | -------------- |
| `sql` | Build `SqlFragment` (params, raw, idents, join) |
| `compile` | Fragment → `{ text, values }` with dialect placeholders |
| codecs | Encode/decode JS ↔ SQL-ish wire values |
| `createDb` | Facade over `Driver` |
| drivers | Platform-specific `Driver` implementations |

## Dialect families

| Family | Placeholders | Identifiers |
| ------ | ------------ | ----------- |
| postgres | `$1` | `"double"` |
| mysql | `?` | `` `backtick` `` |
| sqlite | `?` | `"double"` |
| mssql | `@p1` | `[brackets]` |

Platforms map onto a family plus optional `quirks` tags (`neon`, `planetscale`, `cockroach`, `d1`, …).

## Transactions

Session drivers (pg pool, mysql2, sqlite, mssql, bun-sqlite, libsql) support interactive `begin`/`commit`/`rollback`.

HTTP serverless drivers may throw `TX_UNSUPPORTED` for interactive `DriverTx`. RDS Data API supports transaction ids when the API allows.

Nested transactions are not supported in v1.

## Non-goals (v1)

- Migrations / schema DSL
- ORM models / relations
- Connection pool UI
- Replica routing policy
- GraphQL or cache layers
- Non-SQL databases

## Testing

- Unit: sql composition, compile all dialects, codecs, mock driver, D1 structural fake
- Integration: Bun SQLite when running under Bun
- Peer missing: clear `PEER_MISSING` without installing native drivers
