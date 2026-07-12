import { createContext } from "preact";
import type { RouteMatch, RouterRuntime } from "../core/types.ts";

export interface RouterContextValue {
  router: RouterRuntime;
  /** Index of this branch depth for Outlet (0 = root). */
  outletIndex: number;
  matches: RouteMatch[];
}

export const RouterContext = createContext<RouterContextValue | null>(null);
