import { frame } from "./driver.ts";
import { MotionValue, motionValue } from "./motion-value.ts";
import { createSpring } from "./spring.ts";
import { createKeyframes, createTween } from "./tween.ts";
import { shouldReduceMotion } from "./reduced-motion.ts";
import type {
  AnimationPlaybackControls,
  ReducedMotionSetting,
  SpringTransition,
  Target,
  Transition,
  TweenTransition,
} from "./types.ts";
import { applyStyle, type StyleBag } from "../style/apply-style.ts";
import { isColorString, mixHex, parseNumber, readStyleNumber } from "../style/parse.ts";
import { DEFAULT_TRANSFORM, isTransformKey } from "../style/transform.ts";

export type AnimateOptions = Transition & {
  reducedMotion?: ReducedMotionSetting;
};

type ActiveAnim = {
  stop: () => void;
};

function pickTransition(key: string, transition?: Transition): SpringTransition | TweenTransition {
  if (!transition) return { type: "spring", stiffness: 300, damping: 30 };
  const per = transition[key];
  if (per && typeof per === "object" && !Array.isArray(per)) {
    return per as SpringTransition | TweenTransition;
  }
  return transition as SpringTransition | TweenTransition;
}

function isSpring(t: SpringTransition | TweenTransition): t is SpringTransition {
  return (t as SpringTransition).type === "spring";
}

/**
 * Animate a MotionValue toward a numeric target.
 */
export function animateValue(
  mv: MotionValue,
  to: number,
  transition: SpringTransition | TweenTransition = { type: "spring" },
  opts?: { reducedMotion?: ReducedMotionSetting },
): AnimationPlaybackControls {
  let stopped = false;
  let resolveFinished!: () => void;
  const finished = new Promise<void>((r) => {
    resolveFinished = r;
  });

  const reduce = shouldReduceMotion(opts?.reducedMotion ?? "user");
  if (reduce) {
    mv.jump(to);
    queueMicrotask(() => resolveFinished());
    return {
      stop: () => {
        stopped = true;
      },
      finished,
    };
  }

  const from = (transition as TweenTransition).from != null
    ? parseNumber((transition as TweenTransition).from as number)
    : mv.get();

  if ((transition as TweenTransition).from != null) {
    mv.jump(from, false);
  }

  let cancelFrame: (() => void) | null = null;

  if (isSpring(transition)) {
    const spring = createSpring({
      stiffness: transition.stiffness,
      damping: transition.damping,
      mass: transition.mass,
      velocity: transition.velocity ?? mv.getVelocity(),
      restDelta: transition.restDelta,
      restSpeed: transition.restSpeed,
    });
    let delayLeft = (transition.delay ?? 0) * 1000;
    cancelFrame = frame.update((_t, delta) => {
      if (stopped) return;
      if (delayLeft > 0) {
        delayLeft -= delta;
        return;
      }
      const { position, done } = spring.step(mv.get(), to, delta);
      mv.set(position);
      if (done) {
        cancelFrame?.();
        cancelFrame = null;
        resolveFinished();
      }
    });
  } else {
    const values =
      (transition as TweenTransition).type === "keyframes" && Array.isArray((transition as { keyframes?: number[] }).keyframes)
        ? ((transition as { keyframes: number[] }).keyframes)
        : [from, to];
    const runner =
      values.length > 2
        ? createKeyframes({
            values,
            duration: transition.duration,
            ease: transition.ease,
            delay: transition.delay,
            times: transition.times,
          })
        : createTween({
            from: values[0],
            to: values[values.length - 1]!,
            duration: transition.duration,
            ease: transition.ease,
            delay: transition.delay,
          });
    cancelFrame = frame.update((_t, delta) => {
      if (stopped) return;
      const { value, done } = runner.step(delta);
      mv.set(value);
      if (done) {
        cancelFrame?.();
        cancelFrame = null;
        resolveFinished();
      }
    });
  }

  return {
    stop: () => {
      stopped = true;
      cancelFrame?.();
      cancelFrame = null;
      resolveFinished();
    },
    finished,
  };
}

/**
 * Animate an element (or MotionValue map) to a style target.
 */
export function animate(
  target: HTMLElement | MotionValue | Record<string, MotionValue>,
  keyframes: Target | number | number[],
  options: AnimateOptions = {},
): AnimationPlaybackControls {
  if (target instanceof MotionValue) {
    const to = Array.isArray(keyframes)
      ? keyframes[keyframes.length - 1]!
      : typeof keyframes === "number"
        ? keyframes
        : 0;
    return animateValue(target, to as number, options as SpringTransition | TweenTransition, options);
  }

  // MotionValue map
  if (!(target instanceof HTMLElement) && typeof target === "object") {
    const map = target as Record<string, MotionValue>;
    const kf = typeof keyframes === "object" && !Array.isArray(keyframes) ? keyframes : {};
    const controls: AnimationPlaybackControls[] = [];
    for (const [key, to] of Object.entries(kf)) {
      const mv = map[key];
      if (!mv) continue;
      const t = pickTransition(key, options);
      controls.push(animateValue(mv, parseNumber(to as string | number), t, options));
    }
    return combineControls(controls);
  }

  const el = target as HTMLElement;
  const toTarget = (typeof keyframes === "object" && !Array.isArray(keyframes)
    ? keyframes
    : {}) as Target;

  const state: StyleBag = {};
  // seed from defaults + current opacity
  for (const [k, v] of Object.entries(DEFAULT_TRANSFORM)) {
    state[k] = v;
  }
  state.opacity = readStyleNumber(el, "opacity");

  // Read existing inline transform channels if present via data attr snapshot
  const snapshot = (el as HTMLElement & { __ffStyle?: StyleBag }).__ffStyle;
  if (snapshot) Object.assign(state, snapshot);

  const mvs: Record<string, MotionValue> = {};
  const controls: AnimationPlaybackControls[] = [];
  const colorKeys: string[] = [];

  for (const [key, rawTo] of Object.entries(toTarget)) {
    if (rawTo == null) continue;
    if (typeof rawTo === "string" && (isColorString(rawTo) || rawTo.startsWith("#"))) {
      colorKeys.push(key);
      continue;
    }
    const to = parseNumber(rawTo as string | number, isTransformKey(key) ? (DEFAULT_TRANSFORM[key] ?? 0) : 0);
    const from =
      state[key] != null
        ? parseNumber(state[key] as string | number)
        : readStyleNumber(el, key);
    const mv = motionValue(from);
    mvs[key] = mv;
    state[key] = from;
    const t = pickTransition(key, options);
    if ((t as TweenTransition).from == null) {
      (t as TweenTransition).from = from;
    }
    controls.push(animateValue(mv, to, t, options));
  }

  // Simple color tweens (hex only)
  for (const key of colorKeys) {
    const to = String(toTarget[key]);
    const from = String(state[key] ?? to);
    const t = pickTransition(key, options) as TweenTransition;
    const duration = shouldReduceMotion(options.reducedMotion) ? 0 : (t.duration ?? 0.3);
    let elapsed = 0;
    const delay = (t.delay ?? 0) * 1000;
    let cancel: (() => void) | null = null;
    let resolve!: () => void;
    const finished = new Promise<void>((r) => {
      resolve = r;
    });
    cancel = frame.update((_ts, delta) => {
      elapsed += delta;
      if (elapsed < delay) return;
      const p = duration <= 0 ? 1 : Math.min(1, (elapsed - delay) / (duration * 1000));
      state[key] = mixHex(from, to, p);
      flush();
      if (p >= 1) {
        cancel?.();
        resolve();
      }
    });
    controls.push({
      stop: () => {
        cancel?.();
        resolve();
      },
      finished,
    });
  }

  const unsubs: Array<() => void> = [];
  const flush = () => {
    for (const [k, mv] of Object.entries(mvs)) {
      state[k] = mv.get();
    }
    (el as HTMLElement & { __ffStyle?: StyleBag }).__ffStyle = { ...state };
    applyStyle(el, state);
  };

  for (const mv of Object.values(mvs)) {
    unsubs.push(mv.on("change", () => flush()));
  }
  flush();

  const combined = combineControls(controls);
  const origStop = combined.stop;
  combined.finished.then(() => {
    for (const u of unsubs) u();
  });
  return {
    stop: () => {
      origStop();
      for (const u of unsubs) u();
    },
    finished: combined.finished,
  };
}

function combineControls(controls: AnimationPlaybackControls[]): AnimationPlaybackControls {
  return {
    stop: () => {
      for (const c of controls) c.stop();
    },
    finished: Promise.all(controls.map((c) => c.finished)).then(() => undefined),
  };
}

/** Track active element animations for interruption. */
const elementAnims = new WeakMap<HTMLElement, ActiveAnim>();

export function stopElementAnimations(el: HTMLElement): void {
  elementAnims.get(el)?.stop();
  elementAnims.delete(el);
}

export function trackElementAnimation(el: HTMLElement, controls: AnimationPlaybackControls): void {
  stopElementAnimations(el);
  elementAnims.set(el, {
    stop: () => controls.stop(),
  });
  void controls.finished.then(() => {
    if (elementAnims.get(el)?.stop === controls.stop) {
      elementAnims.delete(el);
    }
  });
}
