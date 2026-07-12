# `@fixerframework/adapters`

Deploy adapters for FixerFramework. The first adapter is **Cloudflare Pages**.

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
