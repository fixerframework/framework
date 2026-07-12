import { encode, decode } from "@auth/core/jwt";
import type { ExtractOptions, VerifyOptions } from "./token.ts";
import { extractSessionToken, verifySessionToken } from "./token.ts";
import { buildClerkRedirect } from "./protect.ts";
import { readCookie } from "./cookie.ts";

/** Default salt for deriving the encryption key for the app-session JWT. */
const DEFAULT_SESSION_SALT = "fixerframework.auth.session";

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
  /** On the callback path: verify the returning Clerk token, mint an encrypted
   *  app-session cookie via @auth/core/jwt, and redirect to the return target. */
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
 * Manages the Clerk auth redirect loop: protected route → Clerk sign-in →
 * callback → verified, encrypted app session → back to the original target.
 *
 * The app-session cookie is an encrypted JWE minted by `@auth/core/jwt`, so
 * subsequent route checks (`readSession`) are networkless — no Clerk API call
 * per request — while Clerk remains the source of truth for the identity.
 */
export function createFlowHandler(config: FlowConfig): FlowHandler {
  const sessionCookie = config.sessionCookie ?? "ff_session";
  const returnCookie = config.returnCookie ?? "ff_return_to";
  const maxAge = config.maxAge ?? 86_400;
  const sessionSalt = config.sessionSalt ?? DEFAULT_SESSION_SALT;
  const secure = config.secure ?? true;
  const onSessionError = config.onSessionError;

  return {
    startFlow(request: Request, returnTo?: string): Response {
      const target = safeReturnPath(returnTo ?? new URL(request.url).pathname);
      const location = buildClerkRedirect(config.signInUrl, `${new URL(request.url).origin}${config.callbackPath}`);
      return new Response(null, {
        status: 302,
        headers: {
          location,
          "cache-control": "no-store",
          "set-cookie": buildCookie(returnCookie, target, { maxAgeSec: 600, httpOnly: true, secure }),
        },
      });
    },

    async resumeFlow(request: Request): Promise<FlowResumeResult> {
      const returnTo = safeReturnPath(readCookie(request, returnCookie));

      const clerkToken = extractSessionToken(request, config.verify);
      if (!clerkToken) return errorResponse(400, "No Clerk session token on callback");

      const verified = await verifySessionToken(clerkToken, config.verify);
      if (!verified.valid) return errorResponse(401, "Clerk token verification failed");

      const now = Math.floor(Date.now() / 1000);
      const payload: SessionPayload = {
        userId: verified.userId,
        sessionId: verified.claims.sid,
        issuedAt: now,
        expiresAt: now + maxAge,
      };
      const jwt = await encode({ token: payload, secret: config.secret, salt: sessionSalt, maxAge });

      const response = new Response(null, {
        status: 302,
        headers: {
          location: returnTo,
          "cache-control": "no-store",
        },
      });
      response.headers.append("set-cookie", buildCookie(sessionCookie, jwt, { maxAgeSec: maxAge, httpOnly: true, secure }));
      response.headers.append("set-cookie", clearCookie(returnCookie, secure));
      return { status: "ok", response };
    },

    async readSession(request: Request): Promise<SessionPayload | null> {
      const jwt = readCookie(request, sessionCookie);
      if (!jwt) return null;
      try {
        const payload = (await decode({ token: jwt, secret: config.secret, salt: sessionSalt })) as SessionPayload | null;
        if (!payload?.userId) return null;
        return payload;
      } catch (err) {
        onSessionError?.(err);
        return null;
      }
    },

    clearSession(redirectUrl: string = "/"): Response {
      const safeUrl = safeReturnPath(redirectUrl);
      const response = new Response(null, {
        status: 302,
        headers: { location: safeUrl },
      });
      response.headers.append("set-cookie", clearCookie(sessionCookie, secure));
      response.headers.append("set-cookie", clearCookie(returnCookie, secure));
      return response;
    },
  };
}

interface CookieAttributes {
  maxAgeSec: number;
  httpOnly: boolean;
  sameSite?: "lax" | "strict" | "none";
  secure?: boolean;
}

function buildCookie(name: string, value: string, attrs: CookieAttributes): string {
  const sameSite = attrs.sameSite ?? "lax";
  const flags = [`Max-Age=${attrs.maxAgeSec}`, "Path=/", `SameSite=${sameSite[0]?.toUpperCase()}${sameSite.slice(1)}`];
  if (attrs.httpOnly) flags.push("HttpOnly");
  if (attrs.secure ?? true) flags.push("Secure");
  return `${name}=${encodeURIComponent(value)}; ${flags.join("; ")}`;
}

function clearCookie(name: string, secure = true): string {
  const flags = ["Max-Age=0", "Path=/", "SameSite=Lax", "HttpOnly"];
  if (secure) flags.push("Secure");
  return `${name}=; ${flags.join("; ")}`;
}

/**
 * Validate a return-to path to prevent open-redirect attacks.
 * Only same-origin relative paths are allowed: must start with "/" and
 * must not start with "//" (protocol-relative) or "/\" (backslash, which
 * some browsers treat as a protocol-relative URL). Everything else falls
 * back to "/".
 */
function safeReturnPath(value: string | null | undefined): string {
  if (!value) return "/";
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  return value;
}

function errorResponse(status: number, message: string): { status: "error"; response: Response } {
  return {
    status: "error",
    response: new Response(JSON.stringify({ error: message }), {
      status,
      headers: { "content-type": "application/json" },
    }),
  };
}
