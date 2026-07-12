/**
 * Shared static-asset path heuristics for Cloudflare Pages / Workers handlers.
 */

/** Regex matching common static asset file extensions. */
export const STATIC_ASSET_RE =
  /\.(?:html|js|css|png|jpg|jpeg|gif|webp|avif|svg|ico|woff|woff2|ttf|eot|otf|wasm|map|txt|xml|webmanifest|pdf)$/;

/** Paths always served as static in SSR / worker-first mode. */
export const STATIC_PATH_RE = /^\/(?:assets|static|public)\//;

/** True when the pathname looks like a static asset (by extension or path prefix). */
export function isStaticAssetPath(pathname: string): boolean {
  return STATIC_ASSET_RE.test(pathname) || STATIC_PATH_RE.test(pathname);
}
