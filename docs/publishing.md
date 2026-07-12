# Publishing `@fixerframework/*`

Packages are **built ESM + declaration** artifacts under each package’s `dist/`.
Exports point at `dist/` only (not TypeScript sources).

## Registry

- URL: `https://registry.fixerframework.com`
- Scope: `@fixerframework`
- Auth: set `FIXER_REGISTRY_TOKEN` (see root `.npmrc`)

```bash
export FIXER_REGISTRY_TOKEN=...
```

## Build

From the monorepo root (required after clone — workspace packages resolve built `dist/`):

```bash
bun install
bun run build
```

Build order is topological: `bundler` → `types` → `utils` → (`animation` | `router` | `adapters` | `auth` | `db`) → `state` → `ui`.

## Pack / publish

Always use **Bun** for pack/publish so `workspace:*` and `catalog:` protocols are rewritten to concrete versions. Plain `npm pack` / `npm publish` leave monorepo protocols intact and will break registry installs.

Verify packs (rewrites deps, then deletes tarballs):

```bash
bun run pack:check
```

Publish one package (after build):

```bash
cd packages/utils
bun publish --registry https://registry.fixerframework.com
```

`prepublishOnly` runs `bun run build` in each package.

## Consumer install

```bash
# .npmrc in the consumer project
@fixerframework:registry=https://registry.fixerframework.com
//registry.fixerframework.com/:_authToken=${FIXER_REGISTRY_TOKEN}

bun add @fixerframework/utils @fixerframework/state @fixerframework/ui
```

## Notes

- Root package `fixerframework` stays `private: true` (workspace only).
- `@fixerframework/bundler` is published as a CLI (`fixer-bundle`) plus Vite/Vitest config factories.
- Platform-specific optional bindings for oxfmt/oxlint/rolldown come from those tools; the monorepo pins linux-x64 bindings as **devDependencies** for CI, not as hard runtime deps of the published bundler.
