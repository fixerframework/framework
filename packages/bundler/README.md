# `@fixerframework/bundler`

Shared tooling and CLI for FixerFramework packages and apps.

## Pipeline

Before bundling, `fixer-bundle` runs (fail-fast):

1. **format** — oxfmt (`--write` by default; **`--format-check` for CI / `check` scripts**)
2. **lint** — oxlint (no auto-fix)
3. **typecheck** — `tsgo` via `@typescript/native-preview`, fallback classic `tsc --noEmit` (not the TS7 platform shim)
4. **test** — `vitest run`
5. **build** — Vite (Rolldown) for `--mode lib|app|server`

## Install

From the FixerFramework registry:

```bash
bun add -d @fixerframework/bundler
```

Workspace (this monorepo):

```json
{
  "devDependencies": {
    "@fixerframework/bundler": "workspace:*"
  },
  "scripts": {
    "build": "fixer-bundle --mode lib --no-format --no-lint --no-typecheck --no-test",
    "check": "fixer-bundle --mode lib --no-build --format-check"
  }
}
```

Use **`--format-check`** on `check` so CI does not rewrite sources. Use root `bun run format` (or run without `--format-check`) when you want oxfmt to write.

The published package exports compiled `dist/` (CLI bin: `fixer-bundle` → `dist/cli.js`). After clone, run `bun run build` at the monorepo root (or `packages/bundler`) before using workspace packages.

## Modes

| Mode     | Use                                               |
| -------- | ------------------------------------------------- |
| `lib`    | Libraries (`index.ts` / `src/index.ts` → `dist/`) |
| `app`    | Client apps (`index.html`)                        |
| `server` | Node/Bun servers (`src/server.ts` → `dist/`)      |

### Mode vs local Vite config

If the package has `vite.config.*` (or you pass `--config`), the build step runs the Vite CLI with that file. **`--mode` is not applied** to that Vite invocation (a note is logged). Mode still selects the overall pipeline; use factories inside the local config for lib/app/server shape.

## Externals (lib / server)

- Package `dependencies`, `peerDependencies`, and `optionalDependencies`
- All Node builtins (`builtinModules` and `node:*`)
- `bun:*`

## Typecheck vs DTS

| Step          | Project file                                                                                                               |
| ------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **typecheck** | Prefers `tsconfig.json` (full package, including tests when included)                                                      |
| **DTS emit**  | `tsconfig.build.json` when `declaration: true`; rewrites import extensions under `compilerOptions.outDir` (default `dist`) |

## Optional local configs

Framework-wide forced config is **not** applied in v1. Import factories when you need overrides:

```ts
// vite.config.ts
import { defineLibConfig } from "@fixerframework/bundler/vite/lib";

export default defineLibConfig({
  // overrides
});
```

```ts
// vitest.config.ts
import { defineVitestConfig } from "@fixerframework/bundler/vitest";

export default defineVitestConfig({
  test: { environment: "happy-dom" },
});
```

Also available: `defineAppConfig` from `@fixerframework/bundler/vite/app` and `defineServerConfig` from `@fixerframework/bundler/vite/server`.

Factories set `root` from `cwd` so builds stay package-scoped.

## CLI flags

See `fixer-bundle --help`.

### `--watch`

- **vitest** — switches to `vitest watch` (instead of `vitest run`)
- **Vite** — `--watch` with a local/explicit config file, **or** zero-config programmatic build watch
- With both test and build enabled, vitest watch runs first and **blocks** the pipeline, so the build step is never reached. Use `--no-test` for watch-build only:

```bash
fixer-bundle --mode lib --watch --no-test
```
