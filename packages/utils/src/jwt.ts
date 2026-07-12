/**
 * JWT / token utilities for auth client creation.
 *
 * These decode tokens WITHOUT signature verification — use for client-side
 * expiry checks and claim reads, never for trust decisions.
 */

/** Standard JWT claims plus any custom keys. */
export interface JwtPayload {
  iss?: string;
  sub?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  jti?: string;
  [key: string]: unknown;
}

/** Base64url-encode a string or byte array (no padding). */
export function base64urlEncode(data: string | Uint8Array): string {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Base64url-decode to a UTF-8 string. */
export function base64urlDecode(str: string): string {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/").padEnd(str.length + ((4 - (str.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Decode a JWT payload without verifying the signature.
 * Returns `null` if the token is malformed.
 */
export function decodeJwt<T extends JwtPayload = JwtPayload>(token: string): T | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  const payload = parts[1];
  if (payload === undefined) return null;
  try {
    return JSON.parse(base64urlDecode(payload)) as T;
  } catch {
    return null;
  }
}

/**
 * True when the JWT has expired (or is too close to expiry).
 * @param leewaySeconds  grace period to avoid clock-skew false positives
 * @returns `true` if expired, malformed, or missing `exp`
 */
export function isJwtExpired(token: string, leewaySeconds = 0): boolean {
  const payload = decodeJwt(token);
  if (payload?.exp === undefined || typeof payload.exp !== "number") return true;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp <= now + leewaySeconds;
}
