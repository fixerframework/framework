export type FrameCallback = (timestamp: number, delta: number) => void;

type Queued = {
  id: number;
  cb: FrameCallback;
  keepAlive: boolean;
};

let nextId = 1;
let rafId: number | null = null;
let lastTime = 0;
const processQueue = new Map<number, Queued>();
const renderQueue = new Map<number, Queued>();

/** Test hook: inject custom frame clock. */
let nowFn: () => number = () =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

let rafFn: (cb: FrameRequestCallback) => number =
  typeof requestAnimationFrame !== "undefined"
    ? (cb) => requestAnimationFrame(cb)
    : (cb) => setTimeout(() => cb(nowFn()), 16) as unknown as number;

let cafFn: (id: number) => void =
  typeof cancelAnimationFrame !== "undefined"
    ? (id) => cancelAnimationFrame(id)
    : (id) => clearTimeout(id);

export function __setFrameClock(opts: {
  now?: () => number;
  raf?: (cb: FrameRequestCallback) => number;
  caf?: (id: number) => void;
}): void {
  if (opts.now) nowFn = opts.now;
  if (opts.raf) rafFn = opts.raf;
  if (opts.caf) cafFn = opts.caf;
}

export function __resetFrameClock(): void {
  nowFn = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
  rafFn =
    typeof requestAnimationFrame !== "undefined"
      ? (cb) => requestAnimationFrame(cb)
      : (cb) => setTimeout(() => cb(nowFn()), 16) as unknown as number;
  cafFn =
    typeof cancelAnimationFrame !== "undefined"
      ? (id) => cancelAnimationFrame(id)
      : (id) => clearTimeout(id);
  stopLoop();
  processQueue.clear();
  renderQueue.clear();
  lastTime = 0;
}

function tick(timestamp: number): void {
  rafId = null;
  if (!lastTime) lastTime = timestamp;
  const delta = Math.min(64, Math.max(0, timestamp - lastTime));
  lastTime = timestamp;

  // Copy to allow mutation during iteration
  const processes = [...processQueue.values()];
  for (const item of processes) {
    if (!processQueue.has(item.id)) continue;
    item.cb(timestamp, delta);
    if (!item.keepAlive) processQueue.delete(item.id);
  }

  const renders = [...renderQueue.values()];
  for (const item of renders) {
    if (!renderQueue.has(item.id)) continue;
    item.cb(timestamp, delta);
    if (!item.keepAlive) renderQueue.delete(item.id);
  }

  if (processQueue.size > 0 || renderQueue.size > 0) {
    rafId = rafFn(tick);
  } else {
    lastTime = 0;
  }
}

function ensureLoop(): void {
  if (rafId == null) {
    rafId = rafFn(tick);
  }
}

function stopLoop(): void {
  if (rafId != null) {
    cafFn(rafId);
    rafId = null;
  }
}

function schedule(map: Map<number, Queued>, cb: FrameCallback, keepAlive: boolean): () => void {
  const id = nextId++;
  map.set(id, { id, cb, keepAlive });
  ensureLoop();
  return () => {
    map.delete(id);
  };
}

/**
 * Shared animation frame scheduler.
 * - `update`: physics / motion value integration
 * - `render`: DOM style flushes (after updates)
 */
export const frame = {
  update(cb: FrameCallback, keepAlive = true): () => void {
    return schedule(processQueue, cb, keepAlive);
  },
  render(cb: FrameCallback, keepAlive = true): () => void {
    return schedule(renderQueue, cb, keepAlive);
  },
  /** Advance one frame synchronously (tests). */
  __step(deltaMs = 16.67): void {
    const t = (lastTime || nowFn()) + deltaMs;
    tick(t);
  },
  now(): number {
    return nowFn();
  },
};
