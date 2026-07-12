import { verifyWebhook } from "@clerk/backend/webhooks";
import type { WebhookEvent, WebhookEventType } from "@clerk/backend";
import type {
  Awaitable,
  WebhookConfig,
  WebhookHandler,
  WebhookRouter,
} from "@fixerframework/types/auth/server";
import { defaultKeyGenerator } from "./protect.ts";

/**
 * Typed Clerk webhook router. Wraps `@clerk/backend`'s `verifyWebhook` so
 * signature checking is mandatory, then dispatches to per-event-type handlers.
 * Verification failure → 400; handler failure → 500; otherwise 200. Never throws.
 */
export function createWebhookRouter(config: WebhookConfig = {}): WebhookRouter {
  // Dynamic runtime collection: event type → handler list.
  const handlers = new Map<string, Array<(event: WebhookEvent) => Awaitable<void>>>();
  const keyGenerator = config.keyGenerator ?? defaultKeyGenerator;

  return {
    on<E extends WebhookEventType>(type: E, handler: WebhookHandler): void {
      const list = handlers.get(type);
      if (list) {
        list.push(handler as (event: WebhookEvent) => Awaitable<void>);
      } else {
        handlers.set(type, [handler as (event: WebhookEvent) => Awaitable<void>]);
      }
    },

    async handle(request: Request): Promise<Response> {
      if (config.rateLimiter) {
        const decision = config.rateLimiter.check(keyGenerator(request));
        if (!decision.allowed) {
          return new Response(JSON.stringify({ error: "rate_limit_exceeded" }), {
            status: 429,
            headers: { "content-type": "application/json", "retry-after": String(Math.ceil(decision.retryAfterMs / 1000)) },
          });
        }
      }

      let event: WebhookEvent;
      try {
        event = await verifyWebhook(request, config.signingSecret ? { signingSecret: config.signingSecret } : undefined);
      } catch {
        return new Response(JSON.stringify({ error: "webhook_verification_failed" }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }
      // Dispatch to handlers. Fail-fast: the first handler to throw returns
      // 500 immediately and remaining handlers for this event type are skipped.
      // Note: a verified event with no registered handler still acknowledges 200.
      const list = handlers.get(event.type);
      if (list) {
        for (const handler of list) {
          try {
            await handler(event);
          } catch {
            return new Response(JSON.stringify({ error: "webhook_handler_failed", type: event.type }), {
              status: 500,
              headers: { "content-type": "application/json" },
            });
          }
        }
      }
      return new Response(JSON.stringify({ received: true, type: event.type }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  };
}
