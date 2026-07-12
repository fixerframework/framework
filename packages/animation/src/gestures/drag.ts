import type { DragAxis, DragConstraints } from "../core/types.ts";
import { animate } from "../core/animate.ts";

export interface DragHandlers {
  onDragStart?: (e: PointerEvent) => void;
  onDrag?: (
    e: PointerEvent,
    info: { offset: { x: number; y: number }; point: { x: number; y: number } },
  ) => void;
  onDragEnd?: (e: PointerEvent) => void;
}

export interface DragBindings {
  destroy: () => void;
}

function clamp(n: number, min?: number, max?: number): number {
  if (min != null && n < min) return min;
  if (max != null && n > max) return max;
  return n;
}

/**
 * Pointer drag that writes x/y into the element's __ffStyle + transform via animate jumps.
 */
export function bindDrag(
  el: HTMLElement,
  opts: {
    axis?: DragAxis;
    constraints?: DragConstraints;
    elastic?: number | boolean;
    momentum?: boolean;
    getOffset: () => { x: number; y: number };
    setOffset: (x: number, y: number) => void;
  } & DragHandlers,
): DragBindings {
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let originX = 0;
  let originY = 0;
  let lastX = 0;
  let lastY = 0;
  let lastT = 0;
  let vx = 0;
  let vy = 0;

  const axis = opts.axis === true ? true : opts.axis;
  const elastic =
    opts.elastic === true ? 0.5 : opts.elastic === false || opts.elastic == null ? 0 : opts.elastic;

  const applyConstraints = (x: number, y: number): { x: number; y: number } => {
    const c = opts.constraints;
    if (!c) return { x, y };
    let nx = x;
    let ny = y;
    if (c.left != null || c.right != null) {
      const min = c.left;
      const max = c.right;
      if (elastic && ((min != null && nx < min) || (max != null && nx > max))) {
        if (min != null && nx < min) nx = min + (nx - min) * elastic;
        if (max != null && nx > max) nx = max + (nx - max) * elastic;
      } else {
        nx = clamp(nx, min, max);
      }
    }
    if (c.top != null || c.bottom != null) {
      const min = c.top;
      const max = c.bottom;
      if (elastic && ((min != null && ny < min) || (max != null && ny > max))) {
        if (min != null && ny < min) ny = min + (ny - min) * elastic;
        if (max != null && ny > max) ny = max + (ny - max) * elastic;
      } else {
        ny = clamp(ny, min, max);
      }
    }
    return { x: nx, y: ny };
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    dragging = true;
    el.setPointerCapture?.(e.pointerId);
    const off = opts.getOffset();
    originX = off.x;
    originY = off.y;
    startX = e.clientX;
    startY = e.clientY;
    lastX = e.clientX;
    lastY = e.clientY;
    lastT = performance.now();
    vx = 0;
    vy = 0;
    el.style.touchAction = "none";
    opts.onDragStart?.(e);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!dragging) return;
    const now = performance.now();
    const dt = Math.max(1, now - lastT);
    vx = ((e.clientX - lastX) / dt) * 1000;
    vy = ((e.clientY - lastY) / dt) * 1000;
    lastX = e.clientX;
    lastY = e.clientY;
    lastT = now;

    let dx = e.clientX - startX;
    let dy = e.clientY - startY;
    if (axis === "x") dy = 0;
    if (axis === "y") dx = 0;

    let x = originX + dx;
    let y = originY + dy;
    ({ x, y } = applyConstraints(x, y));
    opts.setOffset(x, y);
    opts.onDrag?.(e, {
      offset: { x, y },
      point: { x: e.clientX, y: e.clientY },
    });
  };

  const onPointerUp = (e: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    try {
      el.releasePointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
    opts.onDragEnd?.(e);

    if (opts.momentum) {
      const off = opts.getOffset();
      let tx = off.x + vx * 0.15;
      let ty = off.y + vy * 0.15;
      if (axis === "x") ty = off.y;
      if (axis === "y") tx = off.x;
      ({ x: tx, y: ty } = applyConstraints(tx, ty));
      // Hard clamp after elastic momentum
      const c = opts.constraints;
      if (c) {
        tx = clamp(tx, c.left, c.right);
        ty = clamp(ty, c.top, c.bottom);
      }
      animate(el, { x: tx, y: ty }, { type: "spring", stiffness: 200, damping: 25 });
    } else if (opts.constraints) {
      const off = opts.getOffset();
      const c = opts.constraints;
      const x = clamp(off.x, c.left, c.right);
      const y = clamp(off.y, c.top, c.bottom);
      if (x !== off.x || y !== off.y) {
        animate(el, { x, y }, { type: "spring", stiffness: 400, damping: 30 });
      }
    }
  };

  el.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);

  return {
    destroy: () => {
      el.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    },
  };
}
