import type { Easing } from "./types.ts";

export function cubicBezier(p1x: number, p1y: number, p2x: number, p2y: number): (t: number) => number {
  // Sampled Newton solver for cubic bezier y given x
  const cx = 3 * p1x;
  const bx = 3 * (p2x - p1x) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * p1y;
  const by = 3 * (p2y - p1y) - cy;
  const ay = 1 - cy - by;

  function sampleX(t: number) {
    return ((ax * t + bx) * t + cx) * t;
  }
  function sampleY(t: number) {
    return ((ay * t + by) * t + cy) * t;
  }
  function sampleDX(t: number) {
    return (3 * ax * t + 2 * bx) * t + cx;
  }

  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const xEst = sampleX(t) - x;
      const d = sampleDX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= xEst / d;
      t = Math.min(1, Math.max(0, t));
    }
    return sampleY(t);
  };
}

const namedEasings: Record<string, (t: number) => number> = {
  linear: (t) => t,
  easeIn: cubicBezier(0.42, 0, 1, 1),
  easeOut: cubicBezier(0, 0, 0.58, 1),
  easeInOut: cubicBezier(0.42, 0, 0.58, 1),
  circIn: (t) => 1 - Math.sqrt(1 - t * t),
  circOut: (t) => Math.sqrt(1 - (t - 1) * (t - 1)),
  circInOut: (t) =>
    t < 0.5
      ? (1 - Math.sqrt(1 - 4 * t * t)) / 2
      : (Math.sqrt(1 - (2 * t - 2) * (2 * t - 2)) + 1) / 2,
};

export function resolveEasing(ease: Easing = "easeInOut"): (t: number) => number {
  if (Array.isArray(ease)) {
    return cubicBezier(ease[0], ease[1], ease[2], ease[3]);
  }
  return namedEasings[ease] ?? namedEasings.easeInOut!;
}

export interface TweenOptions {
  duration?: number;
  ease?: Easing;
  delay?: number;
  from?: number;
  to: number;
}

export function createTween(opts: TweenOptions) {
  const duration = Math.max(0, (opts.duration ?? 0.3) * 1000);
  const ease = resolveEasing(opts.ease);
  const delay = (opts.delay ?? 0) * 1000;
  const from = opts.from ?? 0;
  const to = opts.to;
  let elapsed = 0;
  let started = false;

  return {
    step(deltaMs: number): { value: number; done: boolean } {
      elapsed += deltaMs;
      if (elapsed < delay) {
        return { value: from, done: false };
      }
      if (!started) {
        started = true;
        elapsed = delay; // align start
      }
      const t = duration <= 0 ? 1 : Math.min(1, (elapsed - delay) / duration);
      const value = from + (to - from) * ease(t);
      return { value, done: t >= 1 };
    },
  };
}

/** Multi-stop keyframe interpolation with normalized times. */
export function createKeyframes(opts: {
  values: number[];
  times?: number[];
  duration?: number;
  ease?: Easing;
  delay?: number;
}) {
  const values = opts.values;
  if (values.length === 0) {
    return { step: () => ({ value: 0, done: true }) };
  }
  if (values.length === 1) {
    return { step: () => ({ value: values[0]!, done: true }) };
  }
  const duration = Math.max(0, (opts.duration ?? 0.3) * 1000);
  const delay = (opts.delay ?? 0) * 1000;
  const ease = resolveEasing(opts.ease);
  const times =
    opts.times ??
    values.map((_, i) => (values.length === 1 ? 0 : i / (values.length - 1)));
  let elapsed = 0;

  return {
    step(deltaMs: number): { value: number; done: boolean } {
      elapsed += deltaMs;
      if (elapsed < delay) return { value: values[0]!, done: false };
      const t = duration <= 0 ? 1 : Math.min(1, (elapsed - delay) / duration);
      const e = ease(t);
      // find segment
      let i = 0;
      while (i < times.length - 1 && e > (times[i + 1] ?? 1)) i++;
      const t0 = times[i] ?? 0;
      const t1 = times[i + 1] ?? 1;
      const v0 = values[i] ?? values[0]!;
      const v1 = values[i + 1] ?? values[values.length - 1]!;
      const local = t1 === t0 ? 1 : (e - t0) / (t1 - t0);
      const value = v0 + (v1 - v0) * local;
      return { value, done: t >= 1 };
    },
  };
}
