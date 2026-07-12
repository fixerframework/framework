import type { RateLimiter, RateLimitConfig } from "./rate-limit.ts";
import { createRateLimiter } from "./rate-limit.ts";
import type { SessionClaims, SessionTokenResult, VerifyOptions, ExtractOptions } from "./token.ts";
import { verifySessionToken, requireSession } from "./token.ts";
import type { ProtectOptions, ProtectResult } from "./protect.ts";
import { protect } from "./protect.ts";
import type { FlowConfig, FlowHandler, SessionPayload } from "./flow.ts";
import { createFlowHandler } from "./flow.ts";
import type { WebhookConfig, WebhookRouter } from "./webhook.ts";
import { createWebhookRouter } from "./webhook.ts";

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

/** Default token-bucket shape for auth flows: 10-token burst, 5/sec sustained. */
const DEFAULT_RATE_LIMIT: { capacity: number; refillRate: number; maxKeys?: number } = { capacity: 10, refillRate: 5 };

/**
 * Top-level composed runtime — the wrapper around Clerk (identity + webhooks)
 * and `@auth/core` (encrypted app sessions). Configure once, then use
 * `protect`, `flow`, `requireSession`, `readSession`, and `handleWebhook`.
 */
export function createAuthServer(config: CreateAuthServerConfig): AuthServer {
  const verifyOptions: VerifyOptions = {
    secretKey: config.secretKey,
    jwtKey: config.jwtKey,
    audience: config.audience,
    authorizedParties: config.authorizedParties,
  };

  const rlSettings = config.rateLimit === false ? null : config.rateLimit ?? DEFAULT_RATE_LIMIT;
  const rateLimiter: RateLimiter | undefined = rlSettings
    ? createRateLimiter({ capacity: rlSettings.capacity, refillRate: rlSettings.refillRate, maxKeys: rlSettings.maxKeys })
    : undefined;

  const flowConfig: FlowConfig = {
    secret: config.appSecret,
    signInUrl: config.signInUrl,
    callbackPath: config.callbackPath,
    verify: { ...verifyOptions, cookieName: config.clerkCookieName },
    sessionCookie: config.sessionCookie,
    maxAge: config.maxAge,
    secure: config.secure,
    sessionSalt: config.sessionSalt,
    onSessionError: config.onSessionError,
  };
  const flow = createFlowHandler(flowConfig);

  // Separate rate limiter for webhooks so auth-traffic floods don't exhaust
  // webhook buckets (and vice versa) for the same IP.
  const webhookLimiter: RateLimiter | undefined = rlSettings
    ? createRateLimiter({ capacity: rlSettings.capacity, refillRate: rlSettings.refillRate, maxKeys: rlSettings.maxKeys })
    : undefined;
  const webhookConfig: WebhookConfig = {
    signingSecret: config.webhookSigningSecret,
    rateLimiter: webhookLimiter,
  };
  const webhook = createWebhookRouter(webhookConfig);

  return {
    rateLimiter,
    flow,
    webhook,

    async protect(request: Request, options: Partial<ProtectOptions> = {}): Promise<ProtectResult> {
      const merged: ProtectOptions = {
        verify: { ...verifyOptions, ...options.verify },
        signInUrl: options.signInUrl ?? config.signInUrl,
        rateLimiter: options.rateLimiter ?? rateLimiter,
        keyGenerator: options.keyGenerator,
        redirectUrl: options.redirectUrl,
      };
      return protect(request, merged);
    },

    verifySessionToken(token: string): Promise<SessionTokenResult> {
      return verifySessionToken(token, verifyOptions);
    },

    requireSession(request: Request, options: VerifyOptions & ExtractOptions = {}): Promise<SessionClaims> {
      return requireSession(request, { ...verifyOptions, ...options });
    },

    readSession(request: Request): Promise<SessionPayload | null> {
      return flow.readSession(request);
    },

    handleWebhook(request: Request): Promise<Response> {
      return webhook.handle(request);
    },
  };
}

export type { RateLimiter, RateLimitConfig };
