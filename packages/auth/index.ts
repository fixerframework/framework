// Client (browser): Clerk signals bridge for @fixerframework/state.
//
// This entry point is browser-only — it pulls in @clerk/clerk-js which
// references DOM globals. Server code should import from
// "@fixerframework/auth/server" instead.
export { createClerkAuth } from "./src/clerk-auth.ts";
export type { ClerkAuthRuntime, CreateClerkAuthConfig } from "./src/types.ts";
