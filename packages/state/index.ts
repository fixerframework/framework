/**
 * @fixerframework/state — Unified Signal Store
 *
 * ```ts
 * import { createState } from '@fixerframework/state'
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
 * const count = state.derive(() => projects.data.value?.length ?? 0)
 *
 * state.invalidate(['projects'])
 * await state.mutate({
 *   key: ['tasks', id],
 *   optimistic: (t) => ({ ...t, done: true }),
 *   commit: ({ token }) => api.patch(`/tasks/${id}`, { done: true }, { token }),
 * })
 * ```
 */
export { createState } from "./src/create-state.ts";
export type {
  AuthRuntime,
  Atom,
  CreateStateOptions,
  FetchContext,
  MutateDef,
  Query,
  QueryDef,
  QueryKey,
  QueryScope,
  QueryStatus,
  StateRuntime,
} from "./src/core/types.ts";
