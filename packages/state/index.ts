/**
 * @fixerframework/state — Unified Signal Store
 *
 * ```ts
 * import { createState } from '@fixerframework/state'
 * import type { QueryDef, StateRuntime } from '@fixerframework/types'
 * import { createClerkAuth } from '@fixerframework/auth'
 *
 * const auth = createClerkAuth({ publishableKey: import.meta.env.VITE_CLERK_PK })
 * const state = createState({ auth })
 *
 * const sidebar = state.atom({ open: false })
 * const projects = state.query({
 *   key: ['projects'],
 *   scope: 'user',
 *   fetch: ({ token }) => api.get('/projects', { token }),
 * })
 * ```
 */
export { createState } from "./src/create-state.ts";
