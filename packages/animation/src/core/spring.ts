export interface SpringOptions {
  stiffness?: number;
  damping?: number;
  mass?: number;
  velocity?: number;
  restDelta?: number;
  restSpeed?: number;
}

export interface SpringState {
  position: number;
  velocity: number;
  done: boolean;
}

/**
 * Semi-implicit Euler spring step toward target.
 * Defaults tuned for UI (snappy, lightly underdamped).
 */
export function createSpring(opts: SpringOptions = {}) {
  const stiffness = opts.stiffness ?? 300;
  const damping = opts.damping ?? 25;
  const mass = opts.mass ?? 1;
  const restDelta = opts.restDelta ?? 0.01;
  const restSpeed = opts.restSpeed ?? 2;

  let velocity = opts.velocity ?? 0;

  return {
    setVelocity(v: number) {
      velocity = v;
    },
    getVelocity() {
      return velocity;
    },
    step(position: number, target: number, deltaMs: number): SpringState {
      const dt = Math.min(deltaMs, 64) / 1000;
      // F = -k(x - target) - c*v
      const springForce = -stiffness * (position - target);
      const damperForce = -damping * velocity;
      const acceleration = (springForce + damperForce) / mass;
      velocity += acceleration * dt;
      let next = position + velocity * dt;

      const settled =
        Math.abs(velocity) <= restSpeed && Math.abs(next - target) <= restDelta;
      if (settled) {
        velocity = 0;
        next = target;
        return { position: next, velocity: 0, done: true };
      }
      return { position: next, velocity, done: false };
    },
  };
}

/** Approximate settle time for tests / reduced-motion decisions. */
export function estimateSpringDuration(opts: SpringOptions = {}): number {
  const stiffness = opts.stiffness ?? 300;
  const damping = opts.damping ?? 25;
  const mass = opts.mass ?? 1;
  const omega = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  if (zeta >= 1) return Math.min(2, 6 / omega);
  // underdamped settle heuristic
  return Math.min(2, Math.max(0.15, 4 / (zeta * omega + 0.001)));
}
