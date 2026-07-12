import { useContext } from "preact/hooks";
import { RouterContext } from "./context.ts";

/**
 * Renders the next matched child route's component.
 */
export function Outlet() {
  const ctx = useContext(RouterContext);
  if (!ctx) {
    throw new Error("<Outlet> must be used within <Router>");
  }

  const nextIndex = ctx.outletIndex + 1;
  const match = ctx.matches[nextIndex];
  if (!match) return null;

  const Comp = match.route.component;
  if (!Comp) return null;

  return (
    <RouterContext.Provider
      value={{
        router: ctx.router,
        outletIndex: nextIndex,
        matches: ctx.matches,
      }}
    >
      <Comp />
    </RouterContext.Provider>
  );
}
