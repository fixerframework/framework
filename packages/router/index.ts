/**
 * @fixerframework/router — Declarative SPA router with signals + loaders
 *
 * ```ts
 * import {
 *   createRouter,
 *   Router,
 *   Link,
 *   Outlet,
 *   useLoaderData,
 *   useParams,
 *   redirect,
 * } from '@fixerframework/router'
 *
 * const router = createRouter({
 *   history: 'browser',
 *   routes: [
 *     {
 *       path: '/',
 *       component: Layout,
 *       children: [
 *         { index: true, path: '', component: Home },
 *         {
 *           path: 'posts/:slug',
 *           component: Post,
 *           loader: async ({ params, signal }) => {
 *             const res = await fetch(`/api/posts/${params.slug}`, { signal })
 *             return res.json()
 *           },
 *         },
 *       ],
 *     },
 *   ],
 * })
 *
 * function Layout() {
 *   return (
 *     <div>
 *       <nav><Link href="/">Home</Link></nav>
 *       <Outlet />
 *     </div>
 *   )
 * }
 *
 * render(<Router router={router} />, document.getElementById('app')!)
 * ```
 */

export { createRouter } from "./src/core/create-router.ts";
export { redirect, Redirect, isRedirect } from "./src/core/types.ts";
export type {
  RouteDef,
  RouterRuntime,
  CreateRouterOptions,
  LoaderContext,
  LocationState,
  NavigateOptions,
  NavigationStatus,
  RouteMatch,
  HistoryKind,
} from "./src/core/types.ts";

export { Router, type RouterProps } from "./src/preact/router.tsx";
export { Link, type LinkProps } from "./src/preact/link.tsx";
export { Outlet } from "./src/preact/outlet.tsx";
export {
  useRouter,
  useLocation,
  useParams,
  useLoaderData,
  useNavigation,
} from "./src/preact/hooks.ts";
