import type { WebhookEvent, WebhookEventType } from "@clerk/backend";
import type { Awaitable } from "./common.ts";

export interface RateLimitConfig {
  /** Bucket size; the maximum burst. */
  capacity: number;
  /** Tokens added per second when below capacity. */
  refillRate: number;
  /** Override the clock (ms since epoch). Defaults to Date.now. */
  now?: () => number;
  /** Max buckets to keep before evicting the oldest (default 10_000). */
  maxKeys?: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  /** Tokens remaining in the bucket after this check (>= 0). */
  remaining: number;
  /** When denied, ms until one token will be available; 0 when allowed. */
  retryAfterMs: number;
}

export interface RateLimiter {
  /** Attempt to consume one token for `key`. Never throws. */
  check(key: string): RateLimitDecision;
  /** Drop a key's bucket (e.g. after successful auth, to forgive earlier misses). */
  reset(key: string): void;
  /** Read-only snapshot, mainly for tests and observability. */
  remaining(key: string): number;
}

/**
 * Clerk session JWT claims we rely on. `sub` is the Clerk user id.
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

export interface ProtectOptions {
  /** Token verification options forwarded to verifySessionToken. */
  verify: VerifyOptions & ExtractOptions;
  /** Base Clerk sign-in URL redirected to when unauthenticated. */
  signInUrl: string;
  /** Rate limiter; when omitted, protection runs without throttling. */
  rateLimiter?: RateLimiter;
  /** Derives the rate-limit key from the request. Defaults to client IP. */
  keyGenerator?: (request: Request) => string;
  /** Where to return after sign-in. Defaults to the incoming request URL. */
  redirectUrl?: string | ((request: Request) => string);
}

export type ProtectResult =
  | { status: "authenticated"; userId: string; claims: SessionClaims }
  | { status: "redirect"; response: Response }
  | { status: "unauthenticated"; response: Response }
  | { status: "rate_limited"; response: Response };

export interface SessionPayload {
  userId: string;
  sessionId: string;
  issuedAt: number;
  expiresAt: number;
}

export interface FlowConfig {
  /** Secret used to encrypt the app-session JWT (@auth/core/jwt). */
  secret: string;
  /** Clerk sign-in base URL redirected to on `startFlow`. */
  signInUrl: string;
  /** Path Clerk redirects back to after authentication. */
  callbackPath: string;
  /** Verification options for the returning Clerk token. */
  verify: VerifyOptions & ExtractOptions;
  /** App-session cookie name (default `"ff_session"`). */
  sessionCookie?: string;
  /** Cookie stashing the post-auth return target (default `"ff_return_to"`). */
  returnCookie?: string;
  /** App-session lifetime in seconds (default 86400, i.e. one day). */
  maxAge?: number;
  /** Salt for app-session JWT key derivation (default `"fixerframework.auth.session"`). */
  sessionSalt?: string;
  /** Whether to set the Secure flag on cookies (default true; false for HTTP dev). */
  secure?: boolean;
  /** Called when the app-session JWT can't be decoded (e.g. wrong secret). No-op by default. */
  onSessionError?: (error: unknown) => void;
}

export interface FlowHandler {
  /** Redirect (302) to Clerk sign-in, stashing where to return afterwards. */
  startFlow(request: Request, returnTo?: string): Response;
  /** On the callback path: verify token, mint app-session cookie, redirect. */
  resumeFlow(request: Request): Promise<FlowResumeResult>;
  /** Decode the app-session cookie networkless. Returns null when absent/expired. */
  readSession(request: Request): Promise<SessionPayload | null>;
  /** 302 that clears the app-session and return cookies (sign-out). */
  clearSession(redirectUrl?: string): Response;
}

export type FlowResumeResult =
  | { status: "ok"; response: Response }
  | { status: "error"; response: Response };

/**
 * Verified webhook handler. Receives the full Clerk {@link WebhookEvent} union.
 */
export type WebhookHandler = (event: WebhookEvent) => Awaitable<void>;

export interface WebhookConfig {
  /** Clerk webhook signing secret (or set CLERK_WEBHOOK_SIGNING_SECRET). */
  signingSecret?: string;
  /** Rate limiter for incoming webhook deliveries. */
  rateLimiter?: RateLimiter;
  /** Derives the rate-limit key from the request. Defaults to client IP. */
  keyGenerator?: (request: Request) => string;
}

export interface WebhookRouter {
  /** Register a handler for a specific Clerk event type (`user.created`, …). */
  on<E extends WebhookEventType>(type: E, handler: WebhookHandler): void;
  /** Verify + dispatch a webhook request. Returns a ready Response. */
  handle(request: Request): Promise<Response>;
}

export interface CreateAuthServerConfig {
  /** Clerk publishable key (pk_test… / pk_live…). Not consumed by the server runtime; kept for client-side parity. */
  publishableKey?: string;
  /** Clerk secret key (or set CLERK_SECRET_KEY). */
  secretKey?: string;
  /** PEM JWKS public key — enables networkless token verification. */
  jwtKey?: string;
  /** Allowed audience(s) for session tokens. */
  audience?: string | string[];
  /** Authorized frontend origins tokens may come from. */
  authorizedParties?: string[];
  /** Clerk session cookie name (default `"__session"`). */
  clerkCookieName?: string;

  /** Secret used to encrypt the app-session JWT (@auth/core/jwt). */
  appSecret: string;
  /** Clerk hosted sign-in base URL. */
  signInUrl: string;
  /** Callback path Clerk redirects back to after authentication. */
  callbackPath: string;

  /** Rate limiting. Pass `false` to disable. Defaults to 10 burst / 5 per second. */
  rateLimit?: { capacity: number; refillRate: number; maxKeys?: number } | false;
  /** App-session cookie name (default `"ff_session"`). */
  sessionCookie?: string;
  /** App-session lifetime in seconds (default one day). */
  maxAge?: number;
  /** Whether to set the Secure flag on cookies (default true; false for HTTP dev). */
  secure?: boolean;
  /** Salt for app-session JWT key derivation (default `"fixerframework.auth.session"`). */
  sessionSalt?: string;
  /** Called when the app-session JWT can't be decoded (e.g. wrong secret). No-op by default. */
  onSessionError?: (error: unknown) => void;

  /** Clerk webhook signing secret (or set CLERK_WEBHOOK_SIGNING_SECRET). */
  webhookSigningSecret?: string;
}

export interface AuthServer {
  readonly rateLimiter: RateLimiter | undefined;
  readonly flow: FlowHandler;
  readonly webhook: WebhookRouter;

  /** Route guard. Options default from the server config; pass a request only. */
  protect(request: Request, options?: Partial<ProtectOptions>): Promise<ProtectResult>;
  verifySessionToken(token: string): Promise<SessionTokenResult>;
  /** Extract + verify the session token. Throws AuthRequiredError on failure. */
  requireSession(request: Request, options?: VerifyOptions & ExtractOptions): Promise<SessionClaims>;
  readSession(request: Request): Promise<SessionPayload | null>;
  /** Verify + dispatch a Clerk webhook. Returns a ready Response (never throws). */
  handleWebhook(request: Request): Promise<Response>;
}

export type { Awaitable, WebhookEvent, WebhookEventType };
