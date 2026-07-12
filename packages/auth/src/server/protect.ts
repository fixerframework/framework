import type { ProtectOptions, ProtectResult } from "@fixerframework/types/auth/server";
import { extractSessionToken, verifySessionToken } from "./token.ts";

/**
 * Default rate-limit key: the originating client IP from common proxy headers,
 * falling back to a shared bucket so anonymous traffic is still bounded.
 */
export function defaultKeyGenerator(request: Request): string {
  // Prefer headers that proxies overwrite completely (not append to),
  // so clients can't spoof them by sending a fake value.
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();

  // x-forwarded-for is client-appendable; the leftmost entry is trivially
  // spoofable. Use the rightmost (closest trusted proxy) entry as a
  // best-effort fallback when no trusted-proxy header is present.
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) {
    const parts = fwd.split(",").map((s) => s.trim()).filter(Boolean);
    const last = parts[parts.length - 1];
    if (last) return last;
  }
  return "anonymous";
}

/**
 * Compose `redirect_url` onto a Clerk sign-in base URL, preserving any
 * pre-existing query string.
 */
export function buildClerkRedirect(signInUrl: string, redirectUrl: string): string {
  const separator = signInUrl.includes("?") ? "&" : "?";
  return `${signInUrl}${separator}redirect_url=${encodeURIComponent(redirectUrl)}`;
}

/**
 * Route guard. Throttles via the rate limiter (if any), then verifies the Clerk
 * session token. On success returns the identity; otherwise returns a ready
 * `Response`: 302 redirect to Clerk sign-in (or 401 JSON when the client
 * sends `Accept: application/json`), or 429 when rate-limited.
 * Never throws — callers branch on `status`.
 */
export async function protect(request: Request, options: ProtectOptions): Promise<ProtectResult> {
  const keyGenerator = options.keyGenerator ?? defaultKeyGenerator;

  if (options.rateLimiter) {
    const decision = options.rateLimiter.check(keyGenerator(request));
    if (!decision.allowed) {
      return { status: "rate_limited", response: rateLimitedResponse(decision.retryAfterMs) };
    }
  }

  const token = extractSessionToken(request, options.verify);
  if (!token) {
    return unauthenticatedOrRedirect(request, options);
  }

  const result = await verifySessionToken(token, options.verify);
  if (!result.valid) {
    return unauthenticatedOrRedirect(request, options);
  }
  return { status: "authenticated", userId: result.userId, claims: result.claims };
}

function unauthenticatedOrRedirect(request: Request, options: ProtectOptions): ProtectResult {
  if (wantsJson(request)) return { status: "unauthenticated", response: unauthenticatedResponse() };
  return { status: "redirect", response: redirectResponse(request, options) };
}

function wantsJson(request: Request): boolean {
  const accept = request.headers.get("accept");
  return !!accept && accept.toLowerCase().includes("application/json");
}

function unauthenticatedResponse(): Response {
  return new Response(
    JSON.stringify({ error: "unauthenticated" }),
    { status: 401, headers: { "content-type": "application/json" } },
  );
}

function rateLimitedResponse(retryAfterMs: number): Response {
  return new Response(
    JSON.stringify({ error: "rate_limit_exceeded", retry_after_ms: retryAfterMs }),
    {
      status: 429,
      headers: {
        "content-type": "application/json",
        "retry-after": String(Math.ceil(retryAfterMs / 1000)),
      },
    },
  );
}

function resolveRedirectUrl(request: Request, options: ProtectOptions): string {
  if (typeof options.redirectUrl === "function") return options.redirectUrl(request);
  if (typeof options.redirectUrl === "string") return options.redirectUrl;
  return request.url;
}

function redirectResponse(request: Request, options: ProtectOptions): Response {
  const location = buildClerkRedirect(options.signInUrl, resolveRedirectUrl(request, options));
  return new Response(null, {
    status: 302,
    headers: { location, "cache-control": "no-store" },
  });
}
