/**
 * Typed error hierarchy for @fixerframework/auth.
 * Every error carries a stable `code` so callers can branch without string matching.
 */
export abstract class AuthError extends Error {
  abstract readonly code: string;
  // Subclasses override `name` with their own literal; the base leaves it
  // typed as `string` (from Error) so those overrides are assignable.
}

/** No valid session token was present or verification failed. */
export class AuthRequiredError extends AuthError {
  readonly code = "AUTH_REQUIRED";
  override readonly name = "AuthRequiredError";
  constructor(message = "Authentication required") {
    super(message);
  }
}

/** Rate limiter denied the request. `retryAfterMs` advises the client when to retry. */
export class RateLimitExceededError extends AuthError {
  readonly code = "RATE_LIMIT_EXCEEDED";
  override readonly name = "RateLimitExceededError";
  constructor(
    public readonly retryAfterMs: number,
    message = "Rate limit exceeded",
  ) {
    super(message);
  }
}

/** Clerk webhook signature verification failed. */
export class WebhookVerificationError extends AuthError {
  readonly code = "WEBHOOK_VERIFICATION_FAILED";
  override readonly name = "WebhookVerificationError";
  constructor(message = "Webhook verification failed", options?: ErrorOptions) {
    super(message, options);
  }
}

/** A registered webhook handler threw. The original error is preserved. */
export class WebhookHandlerError extends AuthError {
  readonly code = "WEBHOOK_HANDLER_FAILED";
  override readonly name = "WebhookHandlerError";
  constructor(
    public readonly eventType: string,
    cause: unknown,
  ) {
    super(`Webhook handler for "${eventType}" failed`, { cause });
  }
}

/** App-session JWT (issued by @auth/core/jwt) could not be decoded or is expired. */
export class SessionTokenError extends AuthError {
  readonly code = "SESSION_TOKEN_INVALID";
  override readonly name = "SessionTokenError";
  constructor(message = "Session token is invalid or expired") {
    super(message);
  }
}
