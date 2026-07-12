import type { ComponentChildren, JSX } from "preact";

/** Style keys that participate in the motion transform pipeline. */
export type TransformKey =
  | "x"
  | "y"
  | "z"
  | "scale"
  | "scaleX"
  | "scaleY"
  | "rotate"
  | "rotateX"
  | "rotateY"
  | "skewX"
  | "skewY"
  | "transformOrigin";

/** Common animatable style target. */
export type StyleKey = TransformKey | "opacity" | (string & {});

export type Target = Partial<Record<StyleKey, string | number>>;

export type Variant = Target & {
  transition?: Transition;
  transitionEnd?: Target;
};

export type Variants = Record<string, Variant>;

export type TargetAndTransition = Variant;

export type EasingName =
  | "linear"
  | "easeIn"
  | "easeOut"
  | "easeInOut"
  | "circIn"
  | "circOut"
  | "circInOut";

export type Easing = EasingName | [number, number, number, number];

export interface SpringTransition {
  type: "spring";
  stiffness?: number;
  damping?: number;
  mass?: number;
  velocity?: number;
  restDelta?: number;
  restSpeed?: number;
  delay?: number;
  from?: number;
}

export interface TweenTransition {
  type?: "tween" | "keyframes";
  duration?: number;
  ease?: Easing;
  delay?: number;
  times?: number[];
  repeat?: number;
  repeatType?: "loop" | "reverse" | "mirror";
  from?: number | string;
}

/** Base spring | tween options, optionally with per-property overrides. */
export type Transition = (SpringTransition | TweenTransition) & {
  /** Per-property transition map and shared keys. */
  [key: string]: SpringTransition | TweenTransition | unknown;
};

export interface AnimationPlaybackControls {
  stop: () => void;
  finished: Promise<void>;
}

export type ReducedMotionSetting = "user" | "always" | "never";

export interface DragConstraints {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export type DragAxis = boolean | "x" | "y";

export interface MotionProps
  extends Omit<JSX.HTMLAttributes<HTMLElement>, "style" | "onDrag" | "onDragStart" | "onDragEnd"> {
  initial?: TargetAndTransition | string | false;
  animate?: TargetAndTransition | string;
  exit?: TargetAndTransition | string;
  variants?: Variants;
  transition?: Transition;
  style?: JSX.CSSProperties | Record<string, string | number | undefined | null>;
  layout?: boolean | "position" | "size";
  layoutId?: string;
  drag?: DragAxis;
  dragConstraints?: DragConstraints;
  dragElastic?: number | boolean;
  dragMomentum?: boolean;
  whileHover?: TargetAndTransition | string;
  whileTap?: TargetAndTransition | string;
  whileFocus?: TargetAndTransition | string;
  onAnimationComplete?: () => void;
  onDragStart?: (e: PointerEvent) => void;
  onDrag?: (
    e: PointerEvent,
    info: { offset: { x: number; y: number }; point: { x: number; y: number } },
  ) => void;
  onDragEnd?: (e: PointerEvent) => void;
  children?: ComponentChildren;
}
