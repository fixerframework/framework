import type { ComponentChildren, VNode } from "preact";
import { cloneElement, toChildArray } from "preact";
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { PresenceContext, type PresenceContextValue } from "./presence-context.ts";

export interface AnimatePresenceProps {
  children?: ComponentChildren;
  /** Called when all exiting children have finished. */
  onExitComplete?: () => void;
  /** If true, only animate the first child (mode popLayout-lite). */
  mode?: "sync" | "wait";
  /** When false, skip enter animations on first mount. */
  initial?: boolean;
}

type Tracked = {
  key: string;
  vnode: VNode;
  present: boolean;
};

function childKey(child: VNode, index: number): string {
  if (child.key != null) return String(child.key);
  return `auto-${index}`;
}

/**
 * Keeps leaving children mounted until exit participants call `safeToRemove`.
 */
export function AnimatePresence({
  children,
  onExitComplete,
  mode = "sync",
  initial: _initial = true,
}: AnimatePresenceProps) {
  const incoming = toChildArray(children).filter(Boolean) as VNode[];
  const [, force] = useState(0);
  const trackedRef = useRef<Tracked[]>([]);
  /** key → set of safeToRemove callbacks still pending */
  const pending = useRef(new Map<string, Set<() => void>>());
  const isInitial = useRef(true);
  const onExitCompleteRef = useRef(onExitComplete);
  onExitCompleteRef.current = onExitComplete;

  const nextKeys = new Set(incoming.map((c, i) => childKey(c, i)));
  const prev = trackedRef.current;
  const prevByKey = new Map(prev.map((t) => [t.key, t]));

  const nextTracked: Tracked[] = [];

  for (const t of prev) {
    if (nextKeys.has(t.key)) {
      const idx = incoming.findIndex((c, i) => childKey(c, i) === t.key);
      const vnode = incoming[idx]!;
      nextTracked.push({ key: t.key, vnode, present: true });
    } else {
      // keep until exit completes
      nextTracked.push({ key: t.key, vnode: t.vnode, present: false });
    }
  }

  for (let i = 0; i < incoming.length; i++) {
    const vnode = incoming[i]!;
    const key = childKey(vnode, i);
    if (!prevByKey.has(key)) {
      nextTracked.push({ key, vnode, present: true });
    } else {
      const existing = nextTracked.find((t) => t.key === key);
      if (existing) {
        existing.vnode = vnode;
        existing.present = true;
      }
    }
  }

  const seen = new Set<string>();
  trackedRef.current = nextTracked.filter((t) => {
    if (seen.has(t.key)) return false;
    seen.add(t.key);
    return true;
  });

  let renderList = trackedRef.current;
  if (mode === "wait") {
    const anyExiting = renderList.some((t) => !t.present);
    if (anyExiting) {
      renderList = renderList.filter((t) => !t.present);
    }
  }

  useLayoutEffect(() => {
    isInitial.current = false;
  }, []);

  // Fallback: if no child registers for exit, drop the node after effects flush
  useEffect(() => {
    let changed = false;
    for (const t of trackedRef.current.slice()) {
      if (t.present) continue;
      if (!pending.current.has(t.key)) {
        trackedRef.current = trackedRef.current.filter((x) => x.key !== t.key);
        changed = true;
      }
    }
    if (changed) {
      force((n) => n + 1);
      if (pending.current.size === 0 && trackedRef.current.every((t) => t.present)) {
        onExitCompleteRef.current?.();
      }
    }
  });

  function makeRegister(key: string): PresenceContextValue["register"] {
    return () => {
      let set = pending.current.get(key);
      if (!set) {
        set = new Set();
        pending.current.set(key, set);
      }
      let removed = false;
      const safeToRemove = () => {
        if (removed) return;
        removed = true;
        set!.delete(safeToRemove);
        if (set!.size === 0) {
          pending.current.delete(key);
          trackedRef.current = trackedRef.current.filter((t) => t.key !== key);
          force((n) => n + 1);
          if (pending.current.size === 0) onExitCompleteRef.current?.();
        }
      };
      set.add(safeToRemove);
      return { safeToRemove };
    };
  }

  return (
    <>
      {renderList.map((t) => {
        const childCtx: PresenceContextValue = {
          isPresent: t.present,
          register: makeRegister(t.key),
        };
        const vnode = cloneElement(t.vnode, { key: t.key });
        return (
          <PresenceContext.Provider key={t.key} value={childCtx}>
            {vnode}
          </PresenceContext.Provider>
        );
      })}
    </>
  );
}
