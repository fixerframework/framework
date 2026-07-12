export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  left: number;
  right: number;
  bottom: number;
}

export function measure(el: HTMLElement): Box {
  const r = el.getBoundingClientRect();
  return {
    x: r.x,
    y: r.y,
    width: r.width,
    height: r.height,
    top: r.top,
    left: r.left,
    right: r.right,
    bottom: r.bottom,
  };
}

export function delta(from: Box, to: Box): { x: number; y: number; scaleX: number; scaleY: number } {
  return {
    x: from.left - to.left,
    y: from.top - to.top,
    scaleX: to.width === 0 ? 1 : from.width / to.width,
    scaleY: to.height === 0 ? 1 : from.height / to.height,
  };
}
