/**
 * @fixerframework/animation — Motion-style engine for Preact
 *
 * ```ts
 * import {
 *   motion,
 *   AnimatePresence,
 *   animate,
 *   useMotionValue,
 *   MotionConfig,
 * } from '@fixerframework/animation'
 *
 * <MotionConfig reducedMotion="user">
 *   <AnimatePresence>
 *     {open && (
 *       <motion.div
 *         initial={{ opacity: 0, y: 8 }}
 *         animate={{ opacity: 1, y: 0 }}
 *         exit={{ opacity: 0 }}
 *         transition={{ type: 'spring', stiffness: 400, damping: 30 }}
 *       />
 *     )}
 *   </AnimatePresence>
 * </MotionConfig>
 * ```
 */

export { motion } from "./src/preact/motion-proxy.ts";
export { createMotionComponent } from "./src/preact/motion.tsx";
export { AnimatePresence } from "./src/presence/animate-presence.tsx";
export { MotionConfig, useMotionConfig } from "./src/preact/motion-config.tsx";
export { animate, animateValue } from "./src/core/animate.ts";
export { motionValue, MotionValue } from "./src/core/motion-value.ts";
export { frame, __setFrameClock, __resetFrameClock } from "./src/core/driver.ts";
export { spring, tween, stagger } from "./src/presets/transitions.ts";
export {
  useMotionValue,
  useSpring,
  useTransform,
  useVelocity,
  useScroll,
  useInView,
  useAnimate,
  useReducedMotion,
} from "./src/preact/hooks.ts";
export { __setReducedMotionOverride } from "./src/core/reduced-motion.ts";

export type {
  MotionProps,
  Transition,
  Variant,
  Variants,
  Target,
  TargetAndTransition,
  AnimationPlaybackControls,
  ReducedMotionSetting,
  DragConstraints,
  DragAxis,
  SpringTransition,
  TweenTransition,
  Easing,
} from "./src/core/types.ts";
