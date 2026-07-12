// Server: composed runtime — the primary entrypoint.
export { createAuthServer } from "./auth-server.ts";
export type { AuthServer, CreateAuthServerConfig } from "./auth-server.ts";

// Rate limiting.
export { createRateLimiter } from "./rate-limit.ts";
export type { RateLimiter, RateLimitConfig, RateLimitDecision } from "./rate-limit.ts";

// Token extraction & verification.
export { extractSessionToken, verifySessionToken, requireSession } from "./token.ts";
export type {
  SessionClaims,
  SessionTokenResult,
  VerifyOptions,
  ExtractOptions,
} from "./token.ts";

// Route protection ("push out to Clerk").
export { protect, buildClerkRedirect, defaultKeyGenerator } from "./protect.ts";
export type { ProtectOptions, ProtectResult } from "./protect.ts";

// Auth redirect-loop manager.
export { createFlowHandler } from "./flow.ts";
export type { FlowConfig, FlowHandler, FlowResumeResult, SessionPayload } from "./flow.ts";

// Typed Clerk webhook router.
export { createWebhookRouter } from "./webhook.ts";
export type { WebhookConfig, WebhookRouter, WebhookHandler } from "./webhook.ts";

// Errors.
export {
  AuthError,
  AuthRequiredError,
  RateLimitExceededError,
  WebhookVerificationError,
  WebhookHandlerError,
  SessionTokenError,
} from "../errors.ts";
