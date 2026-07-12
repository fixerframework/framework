# Design: `@fixerframework/bundler`

**Date:** 2026-07-10  
**Status:** Approved direction (approach A) — pending user review of this written spec  
**Package:** `packages/bundler` → `@fixerframework/bundler`

---

## 1. Problem

FixerFramework packages currently:

- Export raw TypeScript (`"module": "index.ts"`) with no shared build step
- Run Vitest per-package with duplicated Vite/Vitest config
- Rely on root `oxfmt` / `oxlint` scripts that are not part of any package build path

There is no single entrypoint that **formats → lints → typechecks → tests → bundles** before artifacts ship. That gate is required so broken formatting, lint, types, or tests cannot pass through a “build.”

The monorepo already pins the right tools in Bun catalogs (`vite`, `rolldown`, `oxfmt`, `oxlint`, `vitest`, `typescript`, `@typescript/native-preview`). They need a **workspace package** that owns those tools, shared configs consumers can import, and a CLI that enforces the quality pipeline.

---

## 2. Goals

1. Ship `@fixerframework/bundler` with Vite, Rolldown, oxfmt, oxlint, Vitest, TypeScript, and TypeScript native preview (`tsgo` / `@typescript/native-preview`).
2. Provide a CLI that, before bundling, runs: **format → lint → typecheck → test**, then **build**.
3. Support three build modes: **`lib`**, **`app`**, **`server`**.
4. Export **consumable config factories** packages/apps can import; document usage. Do **not** impose a framework-wide forced config in v1 (that comes later).
5. Be the bundler for: the main framework package, larger `@fixerframework/*` packages, and apps built with the framework (including servers).

### Non-goals (v1)

- Auto-migrating every existing package to the bundler
- Monorepo-root enforced shared config for all packages
- Multi-package workspace orchestration (`fixer-bundle --all`)
- Publishing to a public registry (package stays `private: true` like siblings)
- Replacing root `format` / `lint` scripts (root remains for whole-repo sweeps)

---

## 3. Approach

**CLI orchestrator + config factories (Approach A).**

- A bin (`fixer-bundle`) runs an ordered, fail-fast pipeline of subprocesses/API calls.
- Shared configs live under `@fixerframework/bundler/*` export paths for optional local overrides.
- Build uses **Vite 8 + Rolldown** (already cataloged) in mode-specific shapes.

---

## 4. Package layout

```
packages/bundler/
├── package.json
├── tsconfig.json
├── bin/
│   └── fixer-bundle.ts          # shebang entry → cli main
├── src/
│   ├── cli.ts                   # arg parse, cwd, flags
│   ├── pipeline.ts              # ordered steps; stop on first failure
│   ├── run.ts                   # spawn helpers (stdio inherit, exit codes)
│   ├── steps/
│   │   ├── format.ts            # oxfmt --write (or check-only flag)
│   │   ├── lint.ts              # oxlint
│   │   ├── typecheck.ts         # prefer tsgo, fallback tsc --noEmit
│   │   ├── test.ts              # vitest run
│   │   └── build.ts             # vite build with mode config
│   └── config/
│       ├── vite.lib.ts
│       ├── vite.app.ts
│       ├── vite.server.ts
│       ├── vitest.ts
│       └── types.ts             # shared option types
├── test/
│   └── pipeline.test.ts         # unit tests for step order / skip flags
└── README.md
```

### Package identity

| Field | Value |
| ----- | ----- |
| `name` | `@fixerframework/bundler` |
| `private` | `true` |
| `type` | `module` |
| `bin` | `fixer-bundle` → `./bin/fixer-bundle.ts` (Bun-runnable) |

### Dependencies (via root catalogs)

**Dependencies (not devDependencies):** listed so workspace consumers resolve bins and libraries through this package.

| Package | Catalog | Role |
| ------- | ------- | ---- |
| `vite` | `binaries` | Build + config host |
| `rolldown` | `binaries` | Bundler engine (with Vite) |
| `oxfmt` | `binaries` | Format |
| `oxlint` | `binaries` | Lint |
| `vitest` | `binaries` | Test |
| `typescript` | `peers` / `typescript` | `tsc` fallback + types |
| `@typescript/native-preview` | `typescript` | `tsgo` typecheck |
| Platform bindings | `bindings` | `@oxfmt/binding-*`, `@oxlint/binding-*`, `@rolldown/binding-*`, `lightningcss-linux-x64-gnu` as needed for Linux CI/dev |

Root `package.json` should gain a **workspace catalog** entry for `@fixerframework/bundler` so other packages can depend with `catalog:workspace`.

---

## 5. CLI

### Invocation

```bash
fixer-bundle --mode <lib|app|server> [options]
# from a package directory, or:
fixer-bundle --mode lib --cwd packages/state
```

### Flags

| Flag | Default | Meaning |
| ---- | ------- | ------- |
| `--mode` | required | `lib` \| `app` \| `server` |
| `--cwd` | `process.cwd()` | Package/app root to operate on |
| `--no-format` | off | Skip oxfmt |
| `--no-lint` | off | Skip oxlint |
| `--no-typecheck` | off | Skip typecheck |
| `--no-test` | off | Skip vitest |
| `--no-build` | off | Quality gate only (no emit) |
| `--format-check` | off | oxfmt check without write (CI-friendly) |
| `--watch` | off | Watch mode for build/test where supported (format/lint still one-shot unless later extended) |
| `--config` | auto | Path to consumer Vite config; if present, used instead of built-in factory |

### Exit codes

| Code | Meaning |
| ---- | ------- |
| `0` | All requested steps succeeded |
| `1` | A step failed (format/lint/types/tests/build) |
| `2` | Invalid CLI usage (missing mode, bad args) |

### Pipeline order

1. **format** — `oxfmt --write` (or check mode) against package cwd (respect root `.oxfmtrc.json` when present)
2. **lint** — `oxlint` against package cwd (respect root `.oxlintrc.json`)
3. **typecheck** — Prefer `tsgo --noEmit -p tsconfig.json` via `@typescript/native-preview`; if binary unavailable, `tsc --noEmit -p tsconfig.json`
4. **test** — `vitest run` (uses package `vitest.config.*` if present, else bundled default from this package)
5. **build** — Vite build with mode-specific config (unless `--no-build`)

Any non-zero step exit **stops the pipeline immediately** and propagates the failure. No “best effort” continuing after failure.

---

## 6. Build modes

### `lib` — library packages

**Target consumers:** `@fixerframework/state`, `ui`, `animation`, future main framework package, other publishable libs.

| Concern | Default |
| ------- | ------- |
| Entry | `index.ts` or `src/index.ts` (detect first existing) |
| Formats | ESM only (`type: "module"` monorepo) |
| Out dir | `dist/` |
| Externals | `dependencies` + `peerDependencies` from package.json (not bundled) |
| JSX | Preact automatic runtime (`importSource: "preact"`) when JSX present |
| DTS | **v1:** JS emit to `dist/` only. If the package has `tsconfig.build.json` with `"declaration": true`, run `tsc --emitDeclarationOnly -p tsconfig.build.json` after the JS bundle. No Vite DTS plugin in v1. Packages without `tsconfig.build.json` get JS-only `dist/` (fine for private workspace packages that still export source). |

**Config export:** `import { defineLibConfig } from "@fixerframework/bundler/vite/lib"`

### `app` — client applications

**Target consumers:** `apps/web`, `apps/blog`, `apps/registry`, other SPAs.

| Concern | Default |
| ------- | ------- |
| Entry | `index.html` at package root |
| Out dir | `dist/` |
| Env | `import.meta.env` via Vite |
| JSX | Preact automatic runtime |
| SSR | Not in default app mode (use `server` or custom config) |

**Config export:** `import { defineAppConfig } from "@fixerframework/bundler/vite/app"`

### `server` — Node/Bun servers

**Target consumers:** API/SSR servers for framework apps.

| Concern | Default |
| ------- | ------- |
| Entry | `src/server.ts` or `server.ts` (detect) |
| Platform | Vite library/SSR-style build with `ssr: true`, Node-oriented rollupOptions (externalize builtins + package deps) |
| Externals | Node builtins + package deps/peers |
| Out dir | `dist/` |
| Output | ESM for Bun/Node |

**Config export:** `import { defineServerConfig } from "@fixerframework/bundler/vite/server"`

### Mode resolution in CLI

`--mode` selects which factory `build` step uses when no consumer `--config` is provided. If the package has `vite.config.ts` (or `.mts`/`.js`), that file wins unless `--config` points elsewhere; documented recommendation is either:

- **Zero-config:** rely on CLI built-in factory for the mode, or
- **Local config:** `export default defineLibConfig({ ...overrides })` in package `vite.config.ts`

---

## 7. Config exports (consumable, not framework-wide)

### Public export map

```json
{
  "exports": {
    ".": "./src/index.ts",
    "./vite/lib": "./src/config/vite.lib.ts",
    "./vite/app": "./src/config/vite.app.ts",
    "./vite/server": "./src/config/vite.server.ts",
    "./vitest": "./src/config/vitest.ts"
  },
  "bin": {
    "fixer-bundle": "./bin/fixer-bundle.ts"
  }
}
```

(Source exports match existing monorepo style until the bundler dogfoods itself.)

### Vitest helper

`defineVitestConfig(overrides?)` — happy-dom optional; default `include: ["test/**/*.test.ts", "test/**/*.test.tsx"]`; Preact JSX aligned with package vitest configs today.

### Documentation (README)

Document:

1. Adding `@fixerframework/bundler` as a devDependency (`workspace:*` / catalog)
2. Scripts: `"build": "fixer-bundle --mode lib"`, `"check": "fixer-bundle --mode lib --no-build"`
3. Optional local Vite/Vitest config via exported factories
4. Flag reference and pipeline order
5. Explicit note: **framework-wide enforced config is future work**; v1 is opt-in per package

---

## 8. Typecheck strategy (native preview)

1. Resolve `@typescript/native-preview` binary (`tsgo`) from the bundler package’s dependency tree.
2. Run against consumer `tsconfig.json` (or `tsconfig.build.json` if present for typecheck+emit paths).
3. If `tsgo` is missing or fails to spawn (not type errors — spawn failure), fall back to `typescript`’s `tsc`.
4. Type errors always fail the pipeline (exit 1).

Root catalogs already define:

- `@typescript/native-preview`
- `@typescript/native-preview-linux-x64`
- `typescript`

Bundler package must depend on these so consumers do not each re-pin versions.

---

## 9. Integration with the monorepo

### Root `package.json`

- Add `@fixerframework/bundler` to `catalogs.workspace`
- Optionally add root scripts later: `"build:packages": "…"` — **not required in v1**
- Keep root `format` / `lint` as whole-repo tools

### Consumer migration (documented, not mandatory in v1)

Example for a lib package:

```json
{
  "scripts": {
    "build": "fixer-bundle --mode lib",
    "check": "fixer-bundle --mode lib --no-build",
    "test": "vitest run"
  },
  "devDependencies": {
    "@fixerframework/bundler": "catalog:workspace"
  }
}
```

Existing packages may keep standalone `vitest` until they adopt the bundler; no forced cutover.

### Dogfooding path (later)

1. Wire one mid-size package (e.g. `@fixerframework/state` or `animation`) as first consumer
2. Then apps (`app` / `server` modes)
3. Eventually a main framework package build

Out of scope for the initial package PR unless scheduled as a follow-up task in the same change set.

---

## 10. Error handling and DX

- Inherit stdio so oxfmt/oxlint/vitest/vite output is familiar.
- Prefix pipeline logs: `[fixer-bundle] format…`, `[fixer-bundle] lint…`, etc.
- On failure: print which step failed and exit with that step’s code (or 1).
- Invalid `--mode` or missing entry file for build: clear message + exit 2 / 1 respectively.
- Do not auto-fix lint/format beyond what tools do with explicit flags; default format **writes** (local DX). CI should use `--format-check` (and typically still run lint without `--fix` if root currently uses `--fix` — **decision:** lint step runs `oxlint` without `--fix` by default so CI fails on lint; local root script may still use `--fix` separately).

---

## 11. Testing the bundler itself

| Layer | What |
| ----- | ---- |
| Unit | Pipeline respects skip flags and step order (mock runners) |
| Smoke | Run CLI with `--no-build` against a fixture package under `packages/bundler/test/fixtures/lib-pkg` if practical; otherwise unit-only in v1 |

Bundler package scripts:

```json
{
  "test": "vitest run",
  "check": "fixer-bundle --mode lib --no-build"
}
```

Self-host carefully: first implementation may use `vitest run` only until the CLI is stable enough to dogfood `check`.

---

## 12. Implementation sequence

1. Scaffold `packages/bundler` package.json, tsconfig, catalog wiring
2. Implement `run` helper + pipeline + CLI flags
3. Implement steps: format, lint, typecheck, test, build
4. Implement config factories for lib / app / server + vitest
5. README documentation for consumers
6. Unit tests for pipeline ordering/skips
7. `bun install` / verify CLI help and a dry `--no-build` on a fixture or existing package (optional smoke)

---

## 13. Success criteria

- [ ] `@fixerframework/bundler` installs in the workspace with catalog-aligned versions of Vite, Rolldown, oxfmt, oxlint, Vitest, TypeScript, and native preview
- [ ] `fixer-bundle --mode lib --no-build` runs format → lint → typecheck → test and fails the chain on first error
- [ ] `fixer-bundle --mode lib|app|server` builds with the corresponding default config when no local Vite config exists
- [ ] Config factories are importable from documented export paths
- [ ] README documents consumer setup without requiring a monorepo-wide config
- [ ] Pipeline unit tests cover skip flags and ordering

---

## 14. Open decisions (resolved for v1)

| Topic | Decision |
| ----- | -------- |
| API shape | CLI + consumable configs; no framework-wide forced config yet |
| Modes | `lib`, `app`, `server` |
| Typecheck | Prefer `tsgo` (native preview), fallback `tsc` |
| Lint in pipeline | `oxlint` without auto-fix |
| Format in pipeline | Write by default; `--format-check` for CI |
| Migrate all packages | No — opt-in + docs |
| Package privacy | `private: true` like other workspace packages |
