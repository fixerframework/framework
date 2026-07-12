# `@fixerframework/auth`

Auth for FixerFramework. A wrapper around **Clerk** (identity provider, session
tokens, webhook signing) and **`@auth/core`** (encrypted app-session JWTs) for
building rate-limited auth flows that redirect to Clerk, with first-class
integration for webhooks and the auth redirect loop.

## Architecture

- **Clerk** is the source of truth for identity. It verifies session tokens and
  signs webhooks.
- **`@auth/core/jwt`** mints an encrypted (JWE) app-session cookie after Clerk
  verifies a session, so route protection is **networkless** — no Clerk API call
  per request — while Clerk remains the authority for the identity itself.
- A token-bucket **rate limiter** gates auth attempts (sign-in, verification,
  webhook ingestion).

## Client (browser): signals bridge

```ts
import { createClerkAuth } from "@fixerframework/auth";

const auth = createClerkAuth({ publishableKey: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY });
// auth.isLoaded  → Signal<boolean>
// auth.userId    → Signal<string | null>
// auth.getToken()→ Promise<string | null>
// auth.onChange()→ subscribe to identity changes
```

This satisfies the `AuthRuntime` contract consumed by `@fixerframework/state`.

## Server: `createAuthServer`

Server code lives at the `"./server"` subpath so it never pulls in the
browser-only `@clerk/clerk-js` dependency. Configure once, then use `protect`,
`flow`, `requireSession`, `readSession`, and `handleWebhook`.

```ts
import { createAuthServer } from "@fixerframework/auth/server";

export const auth = createAuthServer({
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY!,
  secretKey: process.env.CLERK_SECRET_KEY,
  jwtKey: process.env.CLERK_JWT_KEY,            // networkless token verification
  appSecret: process.env.AUTH_SECRET!,          // encrypts the app-session JWT
  signInUrl: process.env.CLERK_SIGN_IN_URL!,
  callbackPath: "/auth/callback",
});
```

### Protect a route ("push out to Clerk")

```ts
export async function GET(request: Request) {
  const result = await auth.protect(request);
  if (result.status === "authenticated") {
    return new Response(`hello ${result.userId}`);
  }
  return result.response; // 302 → Clerk sign-in, 401 JSON for API clients, or 429
}
```

`protect` throttles via the built-in rate limiter, then verifies the Clerk
session token (Authorization header or `__session` cookie). On success it returns
the identity; otherwise a ready `Response`. When the request sends
`Accept: application/json`, unauthenticated requests get a 401 JSON response
instead of a 302 redirect — so the same guard works for both page and API routes.

### The auth redirect loop

```ts
// /auth/start — begin the Clerk sign-in flow
export async function GET_start(request: Request) {
  return auth.flow.startFlow(request); // 302 → Clerk, stashes where to return
}

// /auth/callback — Clerk redirects back here
export async function GET_callback(request: Request) {
  const result = await auth.flow.resumeFlow(request);
  // On success: mints an encrypted app-session cookie and redirects to the
  // original target. Read it back networkless with auth.readSession(request).
  return result.response;
}

// sign out
export async function POST_signout() {
  return auth.flow.clearSession("/");
}
```

`resumeFlow` verifies the returning Clerk token, mints an encrypted app-session
JWT via `@auth/core/jwt`, and redirects to the stashed return target. Subsequent
requests read the identity with `auth.readSession(request)` — no Clerk call.

### Webhooks

```ts
auth.webhook.on("user.created", (event) => {
  // event is the verified WebhookEvent; narrow on event.type for the payload
});

export async function POST_webhook(request: Request) {
  return auth.handleWebhook(request); // 200 on success, 400/500 on error — never throws
}
```

Signature verification is mandatory (`@clerk/backend` `verifyWebhook`).
Verification failure returns 400; handler failure returns 500; otherwise 200.
Handlers are registered per event type.

## Standalone modules

Each piece is exported individually if you don't want the composed runtime:

| Module | Exports |
| --- | --- |
| Rate limiting | `createRateLimiter`, `RateLimiter`, `RateLimitConfig` |
| Tokens | `extractSessionToken`, `verifySessionToken`, `requireSession` |
| Route guard | `protect`, `buildClerkRedirect`, `defaultKeyGenerator` |
| Flow loop | `createFlowHandler`, `FlowHandler`, `SessionPayload` |
| Webhooks | `createWebhookRouter`, `WebhookRouter`, `WebhookHandler` |
| Errors | `AuthError`, `AuthRequiredError`, `RateLimitExceededError`, `WebhookVerificationError`, `WebhookHandlerError`, `SessionTokenError` |

## Rate limiter

Token bucket, per key (IP by default). Default shape on `createAuthServer`:
10-token burst, 5 tokens/sec sustained, 10 000 max keys. Override or disable:

```ts
createAuthServer({ ..., rateLimit: { capacity: 20, refillRate: 2, maxKeys: 5000 } });
createAuthServer({ ..., rateLimit: false });
```
