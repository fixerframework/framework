// Server: composed runtime — the primary entrypoint.
// Types: import from `@fixerframework/types` or `@fixerframework/types/auth/server`.
export { createAuthServer } from "./auth-server.ts";

// Rate limiting.
export { createRateLimiter } from "./rate-limit.ts";

// Token extraction & verification.
export { extractSessionToken, verifySessionToken, requireSession } from "./token.ts";

// Route protection ("push out to Clerk").
export { protect, buildClerkRedirect, defaultKeyGenerator } from "./protect.ts";

// Auth redirect-loop manager.
export { createFlowHandler } from "./flow.ts";

// Typed Clerk webhook router.
export { createWebhookRouter } from "./webhook.ts";

// Errors.
export {
  AuthError,
  AuthRequiredError,
  RateLimitExceededError,
  WebhookVerificationError,
  WebhookHandlerError,
  SessionTokenError,
} from "../errors.ts";
