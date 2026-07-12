import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin, ResolvedConfig } from "vite";
import type { CloudflarePagesOptions } from "./options.ts";
import { generateRedirects, generateHeaders, generateRoutes } from "./config.ts";

/**
 * Vite plugin for Cloudflare Pages deployments.
 *
 * Hooks into `closeBundle` to emit Cloudflare-specific metadata files
 * (`_redirects`, `_headers`, `_routes.json`) into the build output directory.
 *
 * ```ts
 * // vite.config.ts
 * import { defineAppConfig } from "@fixerframework/bundler/vite/app";
 * import { cloudflarePages } from "@fixerframework/adapters";
 *
 * export default defineAppConfig({
 *   plugins: [cloudflarePages()],
 * });
 * ```
 */
export function cloudflarePages(options: CloudflarePagesOptions = {}): Plugin {
  let resolved: ResolvedConfig;

  return {
    name: "fixerframework:cloudflare-pages",
    apply: "build",
    configResolved(config) {
      resolved = config;
    },
    closeBundle() {
      const outDir = resolve(resolved.root, resolved.build.outDir);
      mkdirSync(outDir, { recursive: true });

      // _redirects
      const redirects = generateRedirects(options);
      if (redirects) {
        writeFileSync(resolve(outDir, "_redirects"), redirects);
      }

      // _headers
      const headers = generateHeaders(options);
      if (headers) {
        writeFileSync(resolve(outDir, "_headers"), headers);
      }

      // _routes.json — only in server mode
      if ((options.mode ?? "static") === "server") {
        const routes = generateRoutes(options);
        writeFileSync(
          resolve(outDir, "_routes.json"),
          `${JSON.stringify(routes, null, 2)}\n`,
        );
      }
    },
  };
}
