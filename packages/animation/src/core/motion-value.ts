import { frame } from "./driver.ts";

export type MotionValueEvent = "change" | "renderRequest" | "destroy";

type Listener = (v: number) => void;

/**
 * Observable numeric value with velocity tracking.
 * String targets (colors) are handled at the animate layer via separate channels.
 */
export class MotionValue {
  private current: number;
  private prev: number;
  private prevTime: number;
  private velocity = 0;
  private listeners = new Map<MotionValueEvent, Set<Listener | (() => void)>>();
  private renderScheduled = false;
  private destroyed = false;

  constructor(init = 0) {
    this.current = init;
    this.prev = init;
    this.prevTime = frame.now();
  }

  get(): number {
    return this.current;
  }

  /** Alias used by Motion-style APIs. */
  getVelocity(): number {
    return this.velocity;
  }

  set(v: number, render = true): void {
    if (this.destroyed) return;
    const now = frame.now();
    const dt = Math.max(1, now - this.prevTime);
    this.velocity = ((v - this.current) / dt) * 1000;
    this.prev = this.current;
    this.prevTime = now;
    if (v === this.current) return;
    this.current = v;
    this.emit("change", v);
    if (render) this.scheduleRender();
  }

  /** Jump without velocity contribution. */
  jump(v: number, render = true): void {
    if (this.destroyed) return;
    this.velocity = 0;
    this.prev = v;
    this.current = v;
    this.prevTime = frame.now();
    this.emit("change", v);
    if (render) this.scheduleRender();
  }

  on(event: "change", cb: Listener): () => void;
  on(event: "renderRequest" | "destroy", cb: () => void): () => void;
  on(event: MotionValueEvent, cb: Listener | (() => void)): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(cb);
    return () => {
      set!.delete(cb);
    };
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.emit("destroy");
    this.listeners.clear();
  }

  private emit(event: MotionValueEvent, v?: number): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const cb of set) {
      if (event === "change") (cb as Listener)(v as number);
      else (cb as () => void)();
    }
  }

  private scheduleRender(): void {
    if (this.renderScheduled) return;
    this.renderScheduled = true;
    frame.render(() => {
      this.renderScheduled = false;
      this.emit("renderRequest");
    }, false);
  }
}

export function motionValue(init = 0): MotionValue {
  return new MotionValue(init);
}
