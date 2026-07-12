import type { Ref } from "preact";
import { createElement } from "preact";
import { forwardRef } from "preact/compat";
import { useContext, useEffect, useLayoutEffect, useRef } from "preact/hooks";
import {
  animate,
  stopElementAnimations,
  trackElementAnimation,
} from "../core/animate.ts";
import type { MotionProps, TargetAndTransition, Transition } from "../core/types.ts";
import { bindDrag } from "../gestures/drag.ts";
import { bindHover } from "../gestures/hover.ts";
import { bindPress } from "../gestures/press.ts";
import { flip } from "../layout/flip.ts";
import { clearLayoutId, publishLayoutId, takeLayoutId } from "../layout/layout-id.ts";
import { measure } from "../layout/measure.ts";
import { PresenceContext } from "../presence/presence-context.ts";
import { applyStyle, type StyleBag } from "../style/apply-style.ts";
import { DEFAULT_TRANSFORM } from "../style/transform.ts";
import { mergeTransition, resolveVariant, variantToTarget } from "../variants/resolve.ts";
import { useMotionConfig } from "./motion-config.tsx";

const MOTION_PROP_KEYS = new Set([
  "initial",
  "animate",
  "exit",
  "variants",
  "transition",
  "layout",
  "layoutId",
  "drag",
  "dragConstraints",
  "dragElastic",
  "dragMomentum",
  "whileHover",
  "whileTap",
  "whileFocus",
  "onAnimationComplete",
  "onDragStart",
  "onDrag",
  "onDragEnd",
]);

function splitProps(props: MotionProps): {
  motion: MotionProps;
  html: Record<string, unknown>;
} {
  const motion: Record<string, unknown> = {};
  const html: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (MOTION_PROP_KEYS.has(k)) motion[k] = v;
    else html[k] = v;
  }
  return { motion: motion as MotionProps, html };
}

function runTo(
  el: HTMLElement,
  definition: TargetAndTransition | string | false | undefined,
  variants: MotionProps["variants"],
  transition: Transition | undefined,
  reducedMotion: ReturnType<typeof useMotionConfig>["reducedMotion"],
  onComplete?: () => void,
): void {
  const variant = resolveVariant(definition, variants);
  if (!variant) {
    onComplete?.();
    return;
  }
  const target = variantToTarget(variant);
  const t = mergeTransition(transition, variant.transition);
  stopElementAnimations(el);
  const controls = animate(el, target, { ...t, reducedMotion });
  trackElementAnimation(el, controls);
  void controls.finished.then(() => {
    if (variant.transitionEnd) {
      const bag = variantToTarget(variant.transitionEnd as TargetAndTransition);
      const prev = (el as HTMLElement & { __ffStyle?: StyleBag }).__ffStyle ?? {};
      const next = { ...prev, ...bag };
      (el as HTMLElement & { __ffStyle?: StyleBag }).__ffStyle = next;
      applyStyle(el, next);
    }
    onComplete?.();
  });
}

export function createMotionComponent(tag: string) {
  const Motion = forwardRef<HTMLElement, MotionProps>(function Motion(props, forwardedRef) {
    const ref = useRef<HTMLElement>(null);
    const config = useMotionConfig();
    const presence = useContext(PresenceContext);
    const { motion: m, html } = splitProps(props);
    // Prefer forwardRef; fall back to ref-in-props if present
    delete html.ref;
    const layoutBox = useRef<ReturnType<typeof measure> | null>(null);
    const offset = useRef({ x: 0, y: 0 });
    const isFirst = useRef(true);
    const hoverActive = useRef(false);
    const tapActive = useRef(false);

    // Apply initial styles + start enter animation before paint
    useLayoutEffect(() => {
      const el = ref.current;
      if (!el) return;

      const base: StyleBag = { ...DEFAULT_TRANSFORM, opacity: 1 };
      (el as HTMLElement & { __ffStyle?: StyleBag }).__ffStyle = base;

      if (m.initial !== false) {
        const initial = resolveVariant(m.initial ?? m.animate, m.variants);
        if (initial) {
          const target = variantToTarget(initial);
          Object.assign(base, target);
          (el as HTMLElement & { __ffStyle?: StyleBag }).__ffStyle = base;
          applyStyle(el, base);
        }
      } else {
        const v = resolveVariant(m.animate, m.variants);
        if (v) {
          const target = variantToTarget(v);
          Object.assign(base, target);
          (el as HTMLElement & { __ffStyle?: StyleBag }).__ffStyle = base;
          applyStyle(el, base);
        }
      }

      // layoutId handoff
      if (m.layoutId) {
        const prev = takeLayoutId(m.layoutId);
        if (prev) {
          const controls = flip(el, prev.box, m.transition ?? config.transition);
          trackElementAnimation(el, controls);
        }
      }

      // Enter animation (first mount)
      if (isFirst.current) {
        isFirst.current = false;
        if (m.initial !== false) {
          runTo(
            el,
            m.animate,
            m.variants,
            mergeTransition(config.transition, m.transition),
            config.reducedMotion,
            m.onAnimationComplete,
          );
        }
      }
    }, []);

    // Subsequent animate prop updates (skip first mount — handled in layout effect)
    const skipFirstAnimateEffect = useRef(true);
    useEffect(() => {
      if (skipFirstAnimateEffect.current) {
        skipFirstAnimateEffect.current = false;
        return;
      }
      const el = ref.current;
      if (!el) return;
      runTo(
        el,
        m.animate,
        m.variants,
        mergeTransition(config.transition, m.transition),
        config.reducedMotion,
        m.onAnimationComplete,
      );
    }, [m.animate, m.variants, m.transition, config.transition, config.reducedMotion]);

    // Exit via presence — only participants with `exit` register (refcount per presence key)
    useEffect(() => {
      if (!presence || presence.isPresent) return;
      const el = ref.current;
      if (!el || !m.exit) return;

      const { safeToRemove } = presence.register();
      runTo(
        el,
        m.exit,
        m.variants,
        mergeTransition(config.transition, m.transition),
        config.reducedMotion,
        () => safeToRemove(),
      );
    }, [presence?.isPresent, m.exit, m.variants, m.transition, config]);

    // Layout FLIP
    useLayoutEffect(() => {
      const el = ref.current;
      if (!el || !m.layout) return;

      const nextBox = measure(el);
      if (layoutBox.current) {
        const prev = layoutBox.current;
        const moved =
          Math.abs(prev.left - nextBox.left) > 0.5 ||
          Math.abs(prev.top - nextBox.top) > 0.5 ||
          Math.abs(prev.width - nextBox.width) > 0.5 ||
          Math.abs(prev.height - nextBox.height) > 0.5;
        if (moved) {
          const controls = flip(
            el,
            prev,
            mergeTransition(config.transition, m.transition) ?? {
              type: "spring",
              stiffness: 500,
              damping: 40,
            },
          );
          trackElementAnimation(el, controls);
        }
      }
      layoutBox.current = measure(el);

      if (m.layoutId) {
        publishLayoutId(m.layoutId, el, layoutBox.current);
      }

      return () => {
        if (m.layoutId) clearLayoutId(m.layoutId);
      };
    });

    // Gestures
    useEffect(() => {
      const el = ref.current;
      if (!el) return;
      const cleanups: Array<() => void> = [];

      const replayBase = () => {
        if (hoverActive.current && m.whileHover) {
          runTo(el, m.whileHover, m.variants, m.transition, config.reducedMotion);
        } else if (tapActive.current && m.whileTap) {
          runTo(el, m.whileTap, m.variants, m.transition, config.reducedMotion);
        } else {
          runTo(el, m.animate, m.variants, m.transition, config.reducedMotion);
        }
      };

      if (m.whileHover) {
        cleanups.push(
          bindHover(
            el,
            () => {
              hoverActive.current = true;
              runTo(el, m.whileHover, m.variants, m.transition, config.reducedMotion);
            },
            () => {
              hoverActive.current = false;
              replayBase();
            },
          ),
        );
      }

      if (m.whileTap) {
        cleanups.push(
          bindPress(
            el,
            () => {
              tapActive.current = true;
              runTo(el, m.whileTap, m.variants, m.transition, config.reducedMotion);
            },
            () => {
              tapActive.current = false;
              replayBase();
            },
          ),
        );
      }

      if (m.whileFocus) {
        const onFocus = () =>
          runTo(el, m.whileFocus, m.variants, m.transition, config.reducedMotion);
        const onBlur = () => replayBase();
        el.addEventListener("focus", onFocus);
        el.addEventListener("blur", onBlur);
        cleanups.push(() => {
          el.removeEventListener("focus", onFocus);
          el.removeEventListener("blur", onBlur);
        });
      }

      if (m.drag) {
        const drag = bindDrag(el, {
          axis: m.drag,
          constraints: m.dragConstraints,
          elastic: m.dragElastic,
          momentum: m.dragMomentum ?? false,
          getOffset: () => offset.current,
          setOffset: (x, y) => {
            offset.current = { x, y };
            const bag = {
              ...((el as HTMLElement & { __ffStyle?: StyleBag }).__ffStyle ?? {
                ...DEFAULT_TRANSFORM,
              }),
              x,
              y,
            };
            (el as HTMLElement & { __ffStyle?: StyleBag }).__ffStyle = bag;
            applyStyle(el, bag);
          },
          onDragStart: m.onDragStart,
          onDrag: m.onDrag,
          onDragEnd: m.onDragEnd,
        });
        cleanups.push(drag.destroy);
      }

      return () => {
        for (const c of cleanups) c();
      };
    }, [
      m.whileHover,
      m.whileTap,
      m.whileFocus,
      m.drag,
      m.dragConstraints,
      m.dragElastic,
      m.dragMomentum,
      m.animate,
      m.variants,
      m.transition,
      config.reducedMotion,
    ]);

    const setRef = (node: HTMLElement | null) => {
      (ref as { current: HTMLElement | null }).current = node;
      const fr = forwardedRef as Ref<HTMLElement> | null;
      if (typeof fr === "function") fr(node);
      else if (fr && typeof fr === "object") (fr as { current: HTMLElement | null }).current = node;
    };

    return createElement(tag, { ...html, ref: setRef });
  });

  Motion.displayName = `motion.${tag}`;
  return Motion;
}

export type MotionComponent = ReturnType<typeof createMotionComponent>;
