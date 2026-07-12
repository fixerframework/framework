# @fixerframework/animation — Motion-style engine for Preact

> Custom MotionValue + rAF animation library. Preact-first, no React, no Motion/Framer dependency. Built for `@fixerframework/ui` overlays and general motion UI.

## Layers

| Layer    | Path              | Role                                              |
| -------- | ----------------- | ------------------------------------------------- |
| Core     | `src/core/`       | MotionValue, rAF driver, spring/tween, `animate()` |
| Style    | `src/style/`      | Transform composition, DOM style batching         |
| Variants | `src/variants/`   | Named variants, stagger                           |
| Layout   | `src/layout/`     | FLIP + `layoutId`                                 |
| Gestures | `src/gestures/`   | Hover, press, drag                                |
| Scroll   | `src/scroll/`     | Scroll progress, in-view                          |
| Presence | `src/presence/`   | `AnimatePresence` exit hold                       |
| Preact   | `src/preact/`     | `motion.*`, hooks, `MotionConfig`                 |

**Dependency direction:** `ui` → `animation`. Animation does **not** depend on `ui` or `state`.

## Public surface (v1)

- `motion` proxy (`motion.div`, …) with `initial` / `animate` / `exit` / `variants` / `transition` / `layout` / `drag` / `while*`
- `AnimatePresence`
- `animate(target, keyframes, transition)`
- Hooks: `useMotionValue`, `useSpring`, `useTransform`, `useVelocity`, `useScroll`, `useInView`, `useAnimate`, `useReducedMotion`
- `MotionConfig` (`reducedMotion`, default `transition`)
- Presets: `spring()`, `tween()`, `stagger()`

## Non-goals (v1)

- React compatibility
- SSR/hydration reconciliation
- SVG path morphing / 3D scene graph
- Full Motion feature parity (shared layout trees, reorder, etc.)

## Accessibility

Default `reducedMotion: "user"` respects `prefers-reduced-motion: reduce` — transform motion snaps, short fades only when useful.
