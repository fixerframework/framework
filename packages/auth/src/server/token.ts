import { verifyToken } from "@clerk/backend";
import type { VerifyTokenOptions } from "@clerk/backend";
import { AuthRequiredError } from "../errors.ts";
import { readCookie } from "./cookie.ts";

/**
 * Clerk session JWT claims we rely on. `sub` is the Clerk user id.
 * Kept as a structural subset (not the full `JwtPayload`) so consumers depend
 * only on the fields this package guarantees.
 */
export interface SessionClaims {
  sub: string;
  sid: string;
  iss: string;
  __raw: string;
  [claim: string]: unknown;
}

export interface VerifyOptions {
  /** Clerk secret key (or set CLERK_SECRET_KEY). */
  secretKey?: string;
  /** PEM JWKS public key — enables networkless verification. */
  jwtKey?: string;
  /** Allowed audience(s) for session tokens. */
  audience?: string | string[];
  /** Authorized parties (frontend origins) the token may come from. */
  authorizedParties?: string[];
  /** Tolerance for clock drift, in ms. */
  clockSkewInMs?: number;
  /** Skip the JWKS cache and always fetch fresh keys. */
  skipJwksCache?: boolean;
}

export interface ExtractOptions {
  /** Authorization header to inspect (default `"Authorization"`). */
  headerName?: string;
  /** Cookie name carrying the session token (default `"__session"`). */
  cookieName?: string;
}

export type SessionTokenResult =
  | { valid: true; userId: string; claims: SessionClaims }
  | { valid: false; reason: "missing" | "invalid"; error?: unknown };

/**
 * Pull a Clerk session token out of a request, preferring the `Authorization:
 * Bearer <token>` header and falling back to the `__session` cookie. Returns
 * `null` when neither carries a usable token.
 */
export function extractSessionToken(request: Request, options: ExtractOptions = {}): string | null {
  const header = request.headers.get(options.headerName ?? "Authorization");
  if (header) {
    const trimmed = header.trim();
    const lower = trimmed.toLowerCase();
    if (lower === "bearer" || lower.startsWith("bearer ")) {
      // Scheme present — the remainder (if any) is the token.
      const token = trimmed.slice(6).trim();
      return token.length > 0 ? token : null;
    }
    // Raw JWT without a scheme — only when it has no whitespace and looks like a JWT.
    if (!trimmed.includes(" ") && trimmed.split(".").length >= 3) return trimmed;
  }

  const cookieName = options.cookieName ?? "__session";
  return readCookie(request, cookieName);
}

/** Build Clerk verify options, omitting undefined keys so env-var fallback works. */
function toVerifyOptions(options: VerifyOptions): VerifyTokenOptions {
  const result: VerifyTokenOptions = {};
  if (options.secretKey !== undefined) result.secretKey = options.secretKey;
  if (options.jwtKey !== undefined) result.jwtKey = options.jwtKey;
  if (options.audience !== undefined) result.audience = options.audience;
  if (options.authorizedParties !== undefined) result.authorizedParties = options.authorizedParties;
  if (options.clockSkewInMs !== undefined) result.clockSkewInMs = options.clockSkewInMs;
  if (options.skipJwksCache !== undefined) result.skipJwksCache = options.skipJwksCache;
  return result;
}

/**
 * Verify a Clerk session token and normalize the result into a discriminated
 * union. Networkless when `jwtKey` is supplied; otherwise fetches JWKS.
 */
export async function verifySessionToken(
  token: string,
  options: VerifyOptions = {},
): Promise<SessionTokenResult> {
  try {
    const claims = (await verifyToken(token, toVerifyOptions(options))) as SessionClaims;
    claims.__raw = token;
    if (!claims.sub) {
      return { valid: false, reason: "invalid", error: new Error("token missing sub claim") };
    }
    if (!claims.sid) {
      return { valid: false, reason: "invalid", error: new Error("token missing sid claim") };
    }
    return { valid: true, userId: claims.sub, claims };
  } catch (err) {
    return { valid: false, reason: "invalid", error: err };
  }
}

/**
 * Extract + verify in one shot for routes that must have a live session.
 * Throws {@link AuthRequiredError} when the token is missing or invalid.
 */
export async function requireSession(
  request: Request,
  options: VerifyOptions & ExtractOptions = {},
): Promise<SessionClaims> {
  const token = extractSessionToken(request, options);
  if (!token) throw new AuthRequiredError("No session token present");
  const result = await verifySessionToken(token, options);
  if (!result.valid) throw new AuthRequiredError("Session token verification failed");
  return result.claims;
}
