# FixerFramework

**A full-stack framework built so you can break up with Vercel.**

FixerFramework exists because full-stack React frameworks have accumulated too much platform coupling, complexity, and “works best on our cloud” assumptions. We want a stack you own: Preact-first, signals-native, deploy-anywhere — without the tax of a single vendor’s runtime.

This repository is the monorepo for the framework packages **and**, over time, the production apps that prove they work.

---

## Why FixerFramework

Modern full-stack React frameworks are powerful, but they often:

- Assume a particular host, edge model, or proprietary runtime
- Entangle app code with platform-specific APIs and limits
- Push complexity into the framework so leaving the platform is painful
- Optimize for demos on one cloud rather than portable, production-owned systems

FixerFramework is built to reverse that. Portable by default. Explicit tradeoffs. No “break up with your host and rewrite half your app” tax.

**We help people break up with Vercel** — not out of spite, but because your product should not depend on one company’s product roadmap, pricing, or lock-in surface.

---

## Dogfooding: see it in production

We will build our own **marketing site**, **blog**, and **registry** on FixerFramework.

That is intentional:

1. **You can see it in action** — real apps, real traffic concerns, not toy examples.
2. **Dogfooding raises quality** — if something is painful for us, we fix the framework instead of papering over it.
3. **Production-grade reference apps** live in this repo under `apps/`, so anyone can open the monorepo and study what a serious FixerFramework app looks like.

| App            | Purpose                                      | Location (planned) |
| -------------- | -------------------------------------------- | ------------------ |
| Marketing site | Product story, docs entry, conversion paths  | `apps/web`         |
| Blog           | Long-form content, changelog, engineering    | `apps/blog`        |
| Registry       | Package / component registry and discovery   | `apps/registry`    |

Framework packages stay under `packages/`. Product surfaces that *use* the framework live under `apps/`.

---

## Repository layout

```
fixerframework/
├── apps/                 # Production apps built *with* FixerFramework (coming)
│   ├── web/              # Marketing site
│   ├── blog/             # Blog
│   └── registry/         # Registry
├── packages/
│   ├── types/            # @fixerframework/types (shared public types)
│   ├── auth/             # @fixerframework/auth
│   ├── state/            # @fixerframework/state
│   ├── ui/               # @fixerframework/ui
│   ├── animation/        # @fixerframework/animation
│   ├── router/           # @fixerframework/router
│   ├── bundler/          # @fixerframework/bundler
│   └── utils/            # @fixerframework/utils
├── package.json
└── ROADMAP.md
```

---

## Packages (today)

| Package                 | Role                                                                 |
| ----------------------- | -------------------------------------------------------------------- |
| `@fixerframework/types` | Shared public TypeScript types (import types only from here)         |
| `@fixerframework/auth`  | Auth runtime (e.g. Clerk-backed), signals for identity and tokens    |
| `@fixerframework/state` | Unified signal store: atoms, queries, mutations, auth-aware scope    |
| `@fixerframework/ui`    | Preact primitives + theme, first-class state bridges (`Show`, `Await`, …) |
| `@fixerframework/animation` | Motion-style engine: `motion.*`, presence, springs, layout, drag |
| `@fixerframework/router` | Declarative SPA router: nested layouts, loaders, signals location |
| `@fixerframework/bundler` | Shared Vite/Rolldown build CLI: format → lint → typecheck → test → build |
| `@fixerframework/adapters` | Deploy adapters (Cloudflare Pages, Cloudflare Workers) |
| `@fixerframework/db` | SQL-only multi-platform client (`sql` templates, transactions, many drivers) |
| `@fixerframework/utils` | Shared utilities                                                     |

**Types vs values:** import types from `@fixerframework/types` (or domain subpaths like `@fixerframework/types/state`). Import runtime values from the owning package.

**Dependency direction:** `types` is the foundation for type imports; `ui` → `state` → `utils`; `ui` → `animation`; `router` is independent (signals + Preact only). No cycles.

Stack leanings: **Preact**, **`@preact/signals-core`**, Bun workspaces, portable tooling (Vite/Rolldown, Vitest, oxlint/oxfmt). Not React. Not “deploy only here.”

### Build & publish

Packages ship **built ESM + `.d.ts`** under `dist/` (not raw TypeScript). After clone:

```bash
bun install
bun run build    # topological: bundler → types → utils → … → ui
bun run test
bun run pack:check
```

Registry: `https://registry.fixerframework.com` (scope `@fixerframework`). See [docs/publishing.md](docs/publishing.md).

---

## Philosophy

- **Own your stack** — run on the host you choose; avoid proprietary defaults as the happy path.
- **Dogfood hard** — marketing, blog, and registry ship on FixerFramework first.
- **Show production shape** — `apps/` is the reference for how real products should be structured.
- **Signals over ceremony** — client and server-shaped state share one mental model where possible.
- **Small, explicit packages** — clear boundaries; grow surface area when dogfooding demands it.

---

## Future: our VCS, this as a mirror

Today this repo lives on a conventional host. **One day we will move primary development of FixerFramework to our own VCS server.** When that happens:

- The authoritative source of truth will live on **our** infrastructure
- **This repository becomes a mirror** for discovery, contribution, and ecosystem convenience

That move is part of the same story as the framework itself: own the tools you depend on, from runtime to hosting to version control.

See [ROADMAP.md](./ROADMAP.md) for phases and milestones.

---

## Development

```bash
# Install
bun install

# Format / lint
bun run format
bun run lint

# Test all workspace packages
bun run test
```

Package-level design notes:

- [`packages/state/DESIGN.md`](./packages/state/DESIGN.md)
- [`packages/ui/DESIGN.md`](./packages/ui/DESIGN.md)

---

## Status

Early monorepo. Core packages (`auth`, `state`, `ui`) are under active development. Production apps under `apps/` and public packaging are on the roadmap.

---

## License

TBD — licensing will be published with the first public release.

---

**Build with FixerFramework. Break up with the lock-in.**
