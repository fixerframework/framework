# `@fixerframework/adapters`

Deploy adapters for FixerFramework. Supported hosts:

- **Cloudflare Pages** — `cloudflarePages` + `createPagesHandler`
- **Cloudflare Workers** — `cloudflareWorkers` + `createWorkerHandler`

---

## Cloudflare Pages

### Static SPA mode (default)

Generates `_redirects` (SPA fallback) and `_headers` (asset caching + security) into the build output:

```ts
// vite.config.ts
import { defineAppConfig } from "@fixerframework/bundler/vite/app";
import { cloudflarePages } from "@fixerframework/adapters";

export default defineAppConfig({
  plugins: [cloudflarePages()],
});
```

Deploy with `wrangler pages deploy dist`.

### Server / SSR mode

Generates `_routes.json` so Cloudflare routes static assets directly and sends the rest to your Pages Function:

```ts
// vite.config.ts
export default defineServerConfig({
  plugins: [cloudflarePages({ mode: "server" })],
});
```

```ts
// functions/[[path]].ts
import { createPagesHandler } from "@fixerframework/adapters";
import { server } from "../src/server";

export const onRequest = createPagesHandler(server.handle);
```

### Options

| Option              | Default                                                 | Description                                      |
| ------------------- | ------------------------------------------------------- | ------------------------------------------------ |
| `mode`              | `"static"`                                              | `"static"` or `"server"`                         |
| `spaFallback`       | `true` (static mode)                                    | Generate `/* /index.html 200` in `_redirects`    |
| `redirects`         | `[]`                                                    | Custom redirect rules (`{ from, to, status }`)   |
| `headers`           | `{}`                                                    | Custom `_headers` entries (merged with defaults) |
| `exclude`           | `["/assets/*", "/favicon.ico", …]`                     | `_routes.json` exclude (server mode)             |
| `include`           | `["/*"]`                                                | `_routes.json` include (server mode)             |
| `assetCacheControl` | `"public, max-age=31536000, immutable"`                 | Cache-Control for `/assets/*`                    |

### Generated files

- **`_redirects`** — Cloudflare Pages redirect rules. SPA fallback ensures client-side routing works on refresh.
- **`_headers`** — Response headers. Immutable caching for hashed assets, security headers for all routes.
- **`_routes.json`** (server mode only) — Controls which paths invoke the Pages Function vs serve static assets.

---

## Cloudflare Workers

Uses [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/) and `wrangler deploy` (not `wrangler pages deploy`).

### Static SPA mode (default)

Emits `_headers` into the build output and, when `name` is set, writes `wrangler.json` with SPA not-found handling:

```ts
// vite.config.ts
import { defineAppConfig } from "@fixerframework/bundler/vite/app";
import { cloudflareWorkers } from "@fixerframework/adapters";

export default defineAppConfig({
  plugins: [
    cloudflareWorkers({
      name: "my-app",
    }),
  ],
});
```

Generated Wrangler shape (simplified):

```json
{
  "name": "my-app",
  "compatibility_date": "2026-07-01",
  "assets": {
    "directory": "./dist",
    "not_found_handling": "single-page-application"
  }
}
```

Deploy with `wrangler deploy`.

If you already maintain `wrangler.toml` / `wrangler.json`, omit `name` (or set `writeWrangler: false`) and use the plugin only for `_headers` / `_redirects`. You can still call `generateWranglerConfig()` from custom scripts.

### Server / SSR mode

Worker script + static assets. Generates Wrangler with `main`, `assets.binding`, and `run_worker_first` so the Worker runs ahead of asset serving:

```ts
// vite.config.ts
export default defineServerConfig({
  plugins: [
    cloudflareWorkers({
      name: "my-app",
      mode: "server",
      main: "./src/worker.ts",
    }),
  ],
});
```

```ts
// src/worker.ts
import { createWorkerHandler } from "@fixerframework/adapters";
import { server } from "./server";

export default {
  fetch: createWorkerHandler(server.handle),
};
```

`createWorkerHandler` delegates static-looking paths to `env.ASSETS` when the binding is present; everything else goes to your app handler.

### Options

| Option                | Default                              | Description                                                                 |
| --------------------- | ------------------------------------ | --------------------------------------------------------------------------- |
| `mode`                | `"static"`                           | `"static"` or `"server"`                                                    |
| `name`                | —                                    | Worker name; enables writing `wrangler.json`                                |
| `main`                | —                                    | Worker entry for Wrangler `main` (server mode)                              |
| `spaFallback`         | `true` static / `false` server       | Sets `assets.not_found_handling` to `"single-page-application"`             |
| `compatibilityDate`   | `"2026-07-01"`                       | Wrangler `compatibility_date`                                               |
| `compatibilityFlags`  | `[]`                                 | Optional Wrangler flags                                                     |
| `assetsDirectory`     | Vite `outDir` (e.g. `./dist`)        | Override `assets.directory`                                                 |
| `assetsBinding`       | `"ASSETS"`                           | Binding name in server mode                                                 |
| `runWorkerFirst`      | `true` (server mode)                 | `boolean` or path patterns for `assets.run_worker_first`                    |
| `redirects`           | `[]`                                 | Custom `_redirects` rules (SPA is **not** done via `_redirects` on Workers) |
| `headers`             | `{}`                                 | Custom `_headers` entries (merged with defaults)                            |
| `assetCacheControl`   | immutable long-cache                 | Cache-Control for `/assets/*`                                               |
| `wranglerPath`        | `"wrangler.json"`                    | Path relative to project root                                               |
| `writeWrangler`       | `true` when `name` is set            | Set `false` to skip writing Wrangler config                                 |

### Generated files

- **`_headers`** — Same format as Pages; applied to static asset responses.
- **`_redirects`** — Only when custom `redirects` are provided (no SPA rewrite line).
- **`wrangler.json`** — When `name` is set; project-root deploy config for `wrangler deploy`.

### Pages vs Workers

| | Pages | Workers |
| - | ----- | ------- |
| Plugin | `cloudflarePages()` | `cloudflareWorkers({ name })` |
| SPA fallback | `_redirects` `/* /index.html 200` | `not_found_handling: "single-page-application"` |
| Server routing | `_routes.json` | `run_worker_first` + optional ASSETS in handler |
| Runtime | `createPagesHandler` → `onRequest` | `createWorkerHandler` → `export default { fetch }` |
| Deploy | `wrangler pages deploy dist` | `wrangler deploy` |
