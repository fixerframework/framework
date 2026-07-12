import { describe, it, expect } from "vitest";
import {
  AuthError,
  AuthRequiredError,
  RateLimitExceededError,
  WebhookVerificationError,
  WebhookHandlerError,
  SessionTokenError,
} from "../src/errors.ts";

describe("auth errors", () => {
  it("all derive from AuthError", () => {
    expect(new AuthRequiredError()).toBeInstanceOf(AuthError);
    expect(new RateLimitExceededError(1000)).toBeInstanceOf(AuthError);
    expect(new WebhookVerificationError()).toBeInstanceOf(AuthError);
    expect(new WebhookHandlerError("user.created", new Error("x"))).toBeInstanceOf(AuthError);
    expect(new SessionTokenError()).toBeInstanceOf(AuthError);
  });

  it("each subclass exposes a stable code distinct from the others", () => {
    const codes = [
      new AuthRequiredError().code,
      new RateLimitExceededError(0).code,
      new WebhookVerificationError().code,
      new WebhookHandlerError("e", new Error()).code,
      new SessionTokenError().code,
    ];
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes).toContain("AUTH_REQUIRED");
    expect(codes).toContain("RATE_LIMIT_EXCEEDED");
  });

  it("RateLimitExceededError carries retryAfterMs", () => {
    expect(new RateLimitExceededError(2500).retryAfterMs).toBe(2500);
  });

  it("WebhookHandlerError preserves the original cause and event type", () => {
    const inner = new Error("db down");
    const err = new WebhookHandlerError("user.deleted", inner);
    expect(err.eventType).toBe("user.deleted");
    expect(err.cause).toBe(inner);
  });

  it("errors are real Error instances with correct names", () => {
    expect(new AuthRequiredError().name).toBe("AuthRequiredError");
    expect(new WebhookVerificationError("bad sig").message).toBe("bad sig");
  });
});
