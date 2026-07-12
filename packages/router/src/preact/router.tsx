import type { ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";
import type { RouterRuntime } from "../core/types.ts";
import { RouterContext } from "./context.ts";
import { useSignalValue } from "./use-signal-value.ts";

export interface RouterProps {
  router: RouterRuntime;
  /** Shown when status is loading and there is no committed match yet. */
  fallback?: ComponentChildren;
  children?: ComponentChildren;
}

/**
 * Provides router context, starts history listening, and renders the matched route tree.
 * Optional `children` render alongside / instead of automatic tree — typically omit children
 * and define components on route defs.
 *
 * `fallback` is for the initial/empty loading state only. On `status === "error"`, this
 * component still renders the matched tree (after a failed load commits location); branch
 * with `useNavigation()` in layouts or leaves for error UI.
 */
export function Router({ router, fallback = null, children }: RouterProps) {
  const [ready, setReady] = useState(false);
  const matches = useSignalValue(router.matches);
  const status = useSignalValue(router.status);

  useEffect(() => {
    const stop = router.start();
    setReady(true);
    return stop;
  }, [router]);

  if (!ready && status === "idle") {
    return <>{fallback}</>;
  }

  if (status === "loading" && matches.length === 0) {
    return <>{fallback}</>;
  }

  const root = matches[0];
  const RootComp = root?.route.component;

  return (
    <RouterContext.Provider
      value={{
        router,
        outletIndex: 0,
        matches,
      }}
    >
      {children}
      {RootComp ? <RootComp /> : null}
    </RouterContext.Provider>
  );
}
