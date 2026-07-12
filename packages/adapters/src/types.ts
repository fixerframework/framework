/**
 * Deploy adapter contracts shared across host adapters.
 */

import type { Plugin } from "vite";

/**
 * A deploy adapter integrates the bundler's build with a specific host.
 * The first adapter is Cloudflare Pages; future adapters follow the same shape.
 */
export interface DeployAdapter {
  /** Adapter name (e.g., "cloudflare-pages"). */
  readonly name: string;
  /** Vite plugin applied during the bundler's build step. */
  plugin(options?: Record<string, unknown>): Plugin;
}

/** Custom redirect rule for `_redirects`. */
export interface RedirectRule {
  /** Source pattern (Cloudflare Pages syntax, e.g., "/old/*"). */
  from: string;
  /** Destination (e.g., "/new/:splat"). */
  to: string;
  /** HTTP status code. 200 = rewrite (serve destination without redirect). */
  status: number;
}
