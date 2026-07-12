import type {
  AuthServer,
  CreateAuthServerConfig,
  ExtractOptions,
  FlowConfig,
  ProtectOptions,
  ProtectResult,
  RateLimiter,
  SessionClaims,
  SessionPayload,
  SessionTokenResult,
  VerifyOptions,
  WebhookConfig,
} from "@fixerframework/types/auth/server";
import { createRateLimiter } from "./rate-limit.ts";
import { verifySessionToken, requireSession } from "./token.ts";
import { protect } from "./protect.ts";
import { createFlowHandler } from "./flow.ts";
import { createWebhookRouter } from "./webhook.ts";

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
