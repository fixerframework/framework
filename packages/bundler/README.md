# `@fixerframework/bundler`

Shared tooling and CLI for FixerFramework packages and apps.

## Pipeline

Before bundling, `fixer-bundle` runs (fail-fast):

1. **format** — oxfmt (`--write` by default; `--format-check` for CI)
2. **lint** — oxlint (no auto-fix)
3. **typecheck** — `tsgo` via `@typescript/native-preview`, fallback `tsc --noEmit`
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
    "check": "fixer-bundle --mode lib --no-build"
  }
}
```

The published package exports compiled `dist/` (CLI bin: `fixer-bundle` → `dist/cli.js`). After clone, run `bun run build` at the monorepo root before using workspace packages.

## Modes

| Mode     | Use                                               |
| -------- | ------------------------------------------------- |
| `lib`    | Libraries (`index.ts` / `src/index.ts` → `dist/`) |
| `app`    | Client apps (`index.html`)                        |
| `server` | Node/Bun servers (`src/server.ts` → `dist/`)      |

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

## CLI flags

See `fixer-bundle --help`.

### `--watch`

- **vitest** — switches to `vitest watch` (instead of `vitest run`)
- **Vite** — passed through only when using a local or explicit config (`vite.config.*` or `--config`)
- **Zero-config programmatic build** (no local Vite config) does **not** watch yet
- With both test and build enabled, vitest watch runs first and **blocks** the pipeline, so the build step is never reached. Use `--no-test` for watch-build only:

```bash
fixer-bundle --mode lib --watch --no-test
```
