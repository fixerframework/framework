/**
 * @fixerframework/utils — Shared utilities
 *
 * Foundation layer: zero runtime dependencies (types via `@fixerframework/types`).
 * Provides type guards, deterministic serialization, async primitives, object helpers,
 * environment detection, and auth-client helpers (JWT decoding, cookie serialization).
 *
 * ```ts
 * import { stableStringify, deferred, decodeJwt, serializeCookie } from '@fixerframework/utils'
 * import type { Deferred, JwtPayload, CookieOptions } from '@fixerframework/types'
 * ```
 */

// Type guards
export {
  isNull,
  isUndefined,
  isString,
  isNumber,
  isBoolean,
  isFunction,
  isObject,
  isPlainObject,
  isArray,
  isPromise,
  isNonNullable,
} from "./src/types.ts";

// Deterministic serialization
export { stableStringify } from "./src/string.ts";

// Async primitives
export { deferred, sleep, withTimeout } from "./src/async.ts";

// Object helpers
export { shallowEqual, deepMerge } from "./src/object.ts";

// Environment detection
export { isBrowser, isServer } from "./src/env.ts";

// JWT / token utilities (auth client creation)
export {
  base64urlEncode,
  base64urlDecode,
  decodeJwt,
  isJwtExpired,
} from "./src/jwt.ts";

// Cookie utilities (auth client creation)
export { serializeCookie, parseCookies } from "./src/cookie.ts";
