import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import type { Plugin, ResolvedConfig } from "vite";
import type { CloudflareWorkersOptions } from "./options.ts";
import { generateHeaders, generateRedirects, generateWranglerConfig } from "./config.ts";

/**
 * Vite plugin for Cloudflare Workers deployments (Static Assets + optional Worker).
 *
 * Hooks into `closeBundle` to emit:
 * - `_headers` / optional `_redirects` into the build output directory
 * - `wrangler.json` at the project root when `name` is set
 *
 * ```ts
 * import { defineAppConfig } from "@fixerframework/bundler/vite/app";
 * import { cloudflareWorkers } from "@fixerframework/adapters";
 *
 * export default defineAppConfig({
 *   plugins: [cloudflareWorkers({ name: "my-app" })],
 * });
 * ```
 */
export function cloudflareWorkers(options: CloudflareWorkersOptions = {}): Plugin {
  let resolved: ResolvedConfig;

  return {
    name: "fixerframework:cloudflare-workers",
    apply: "build",
    configResolved(config) {
      resolved = config;
    },
    closeBundle() {
      const outDir = resolve(resolved.root, resolved.build.outDir);
      mkdirSync(outDir, { recursive: true });

      const headers = generateHeaders(options);
      if (headers) {
        writeFileSync(resolve(outDir, "_headers"), headers);
      }

      const redirects = generateRedirects(options);
      if (redirects) {
        writeFileSync(resolve(outDir, "_redirects"), redirects);
      }

      const shouldWriteWrangler =
        Boolean(options.name) && (options.writeWrangler ?? true);

      if (shouldWriteWrangler && options.name) {
        const assetsDirectory =
          options.assetsDirectory ??
          normalizeAssetsDirectory(resolved.root, resolved.build.outDir);

        const wrangler = generateWranglerConfig({
          ...options,
          name: options.name,
          assetsDirectory,
        });

        const wranglerRel = options.wranglerPath ?? "wrangler.json";
        const wranglerAbs = resolve(resolved.root, wranglerRel);
        mkdirSync(dirname(wranglerAbs), { recursive: true });
        writeFileSync(wranglerAbs, `${JSON.stringify(wrangler, null, 2)}\n`);
      }
    },
  };
}

/** Turn Vite outDir into a Wrangler-friendly relative path like `./dist`. */
function normalizeAssetsDirectory(root: string, outDir: string): string {
  const abs = resolve(root, outDir);
  let rel = relative(root, abs).replace(/\\/g, "/");
  if (!rel || rel === ".") {
    rel = "dist";
  }
  return rel.startsWith(".") ? rel : `./${rel}`;
}
