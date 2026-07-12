# FixerFramework — Roadmap

> Strategic plan for the framework, dogfood apps, and long-term ownership of our tooling.
> Check marks mean done. Unchecked items are planned. Order within a phase is priority.

---

## North star

1. **Solve full-stack React framework pain** — portable, Preact-first, signals-native, not coupled to a single cloud.
2. **Help people break up with Vercel** — leave platform lock-in without rewriting product identity into vendor APIs.
3. **Dogfood in public** — marketing site, blog, and registry built with FixerFramework and stored in `apps/`.
4. **Own the full loop** — eventually host primary development on our own VCS; external copies (including this one) become mirrors.

---

## Phase 0 — Foundation (packages)

Ship a coherent core that apps can depend on without platform magic.

- [x] Monorepo workspace (`packages/*`, Bun catalogs)
- [x] `@fixerframework/types` — shared public TypeScript types for all packages
- [x] `@fixerframework/auth` — Clerk + `@auth/core` server runtime (rate limiting, route guard, redirect-loop flow, webhook router, encrypted app sessions) + client signals bridge
- [x] `@fixerframework/state` — atoms, derive, query cache, mutations, auth scope
- [x] `@fixerframework/ui` — Preact primitives, theme, state bridges (`Show`, `Await`, `Match`, `bind`)
- [x] `@fixerframework/animation` — usable public surface + tests
- [x] `@fixerframework/router` — declarative SPA routes, loaders, `Link` / `Outlet`, signals location
- [ ] `@fixerframework/utils` — shared helpers used by other packages
- [x] `@fixerframework/db` — SQL-only multi-platform client (typed `sql`, transactions, broad drivers)
- [x] Root docs: README + ROADMAP (this)
- [x] Stable package exports and peer dependency story for consumers (`dist/` ESM + types, `publishConfig` → registry.fixerframework.com)
- [ ] SSR / hydration path (deferred from state v1; required before serious multi-page apps)

**Exit criteria:** A greenfield Preact app can install workspace packages, auth + query + UI + router, and run without Vercel-specific APIs.

---

## Phase 1 — Dogfood apps under `apps/`

Prove the product by running our own surface area on it. Apps live in-repo as **production-grade** references.

| App        | Path (target)   | Role                                              |
| ---------- | --------------- | ------------------------------------------------- |
| Marketing  | `apps/web`      | Homepage, product story, CTA, framework positioning |
| Blog       | `apps/blog`     | Engineering posts, changelogs, long-form content  |
| Registry   | `apps/registry` | Component / package registry and discovery        |

### 1a — Scaffold

- [ ] Add `apps/` workspace membership
- [ ] Scaffold `apps/web` on FixerFramework packages
- [ ] Scaffold `apps/blog` on FixerFramework packages
- [ ] Scaffold `apps/registry` on FixerFramework packages
- [ ] Shared app tooling (lint, test, typecheck) consistent with packages

### 1b — Marketing site (`apps/web`)

- [ ] Landing that states the mission: full-stack without Vercel lock-in
- [ ] Docs entry points and package overview
- [ ] Deployable on a non-Vercel host (or multi-host) as a first-class path
- [ ] Performance and a11y bar suitable for a public product site

### 1c — Blog (`apps/blog`)

- [ ] Content model and rendering pipeline on FixerFramework
- [ ] First posts: problem statement, dogfooding, “why not full-stack React frameworks as-is”
- [ ] RSS / SEO / static where it makes sense — without host-specific escape hatches as defaults

### 1d — Registry (`apps/registry`)

- [ ] Browse and install path for framework packages / UI primitives
- [ ] Self-hosted or portable registry semantics (no forced proprietary package cloud)
- [ ] Dogfood `@fixerframework/ui` and state patterns in the registry UI itself

### 1e — Quality loop

- [ ] Framework bugs found while building apps are fixed in `packages/` first, then apps adopt
- [ ] `apps/` stay the canonical “this is what production looks like” examples
- [ ] CI covers packages + apps

**Exit criteria:** Marketing, blog, and registry ship (or soft-launch) on FixerFramework; `apps/` is the showcase; dogfooding feedback is flowing into package design.

---

## Phase 2 — Framework depth (from dogfood pressure)

Priorities here will be reordered by what `apps/` actually hurts. Expected themes:

- [ ] `createFixerApp()` (or equivalent) bootstrap: auth + state + render
- [ ] Isomorphic state: server prefetch + client hydrate
- [x] Routing and data loading without platform-only conventions (`@fixerframework/router` SPA + loaders; SSR adapter later)
- [ ] Build / deploy adapters that treat “any host” as the default, not an afterthought
- [ ] First-class DX: typed config, clear errors, docs generated from real apps
- [x] Public versioning and release process foundation (`0.1.0` packages packable via `bun publish`; full release automation later)

**Exit criteria:** New projects can start from templates derived from `apps/*`, not only from package APIs.

---

## Phase 3 — Ecosystem and escape hatches

Make “break up with Vercel” a concrete migration path, not a slogan.

- [ ] Migration guides from common full-stack React setups
- [ ] Comparison docs: what we refuse to couple to (host APIs, proprietary middleware, etc.)
- [ ] Templates for marketing sites, blogs, and registries
- [ ] Community contribution path aligned with dogfood apps

**Exit criteria:** A team can evaluate and migrate a non-trivial app without betting the company on one edge runtime.

---

## Phase 4 — Own the VCS; this becomes a mirror

Primary development moves to **our own VCS server**. External hosting of this tree becomes a **mirror**.

- [ ] Specify and run our VCS server (see related work in the AWFixer stack / Grip direction)
- [ ] Establish FixerFramework as a first-class repo on that server
- [ ] Define mirror policy: what syncs here, how often, and what remains source of truth
- [ ] Contributor workflow: issues/PRs against primary vs mirror
- [ ] Update README and clone URLs: “primary here, mirror there” → “primary on our VCS, this is a mirror”
- [ ] CI and release pipelines that do not assume a single third-party git host

**Exit criteria:** Day-to-day development and releases are authoritative on our VCS; this repository is an intentional, documented mirror for the ecosystem.

---

## Phase 5 — Long-term product

- [ ] Multi-app monorepo patterns documented from `apps/`
- [ ] Registry as the default discovery surface for FixerFramework components and packages
- [ ] Blog as the living changelog and engineering culture
- [ ] Marketing site as the always-current product narrative — still built on FixerFramework
- [ ] Continuous dogfooding: every major framework feature lands in at least one `apps/*` consumer before “stable”

---

## Non-goals (for now)

- Reimplementing every React ecosystem library under a compatibility brand
- Optimizing exclusively for one cloud’s pricing or edge product
- Hiding host lock-in behind “adapters” that only work well on one vendor
- Treating example apps as throwaway demos (they are production surfaces)

---

## How success looks

| Signal                         | What it means                                              |
| ------------------------------ | ---------------------------------------------------------- |
| `apps/web`, `blog`, `registry` | Framework is good enough for our own revenue-adjacent UX   |
| Fewer platform-only APIs       | Leaving a host is a deploy change, not a rewrite           |
| Package quality from dogfood   | Bugs and missing APIs surface in our apps first            |
| Own VCS + mirror               | We own source control the same way we want you to own runtime |

---

## Related docs

- [README.md](./README.md) — mission, layout, philosophy
- [packages/state/DESIGN.md](./packages/state/DESIGN.md) — state package design
- [packages/ui/DESIGN.md](./packages/ui/DESIGN.md) — UI package design
- [packages/router/DESIGN.md](./packages/router/DESIGN.md) — router package design

---

*Last updated: 2026-07-10*
