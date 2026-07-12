/** Parse a CSS numeric value into a number (px/deg/% stripped). */
export function parseNumber(value: string | number | undefined | null, fallback = 0): number {
  if (value == null) return fallback;
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  const m = String(value).trim().match(/^(-?[\d.]+)/);
  if (!m) return fallback;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : fallback;
}

/** Read computed style numeric for a property / transform channel. */
export function readStyleNumber(el: HTMLElement, key: string): number {
  if (key === "opacity") {
    const o = getComputedStyle(el).opacity;
    return o === "" ? 1 : parseNumber(o, 1);
  }
  // Transform channels default from our pipeline; cannot reliably split matrix without state.
  // Callers should supply `from` or existing MotionValue state.
  const defaults: Record<string, number> = {
    x: 0,
    y: 0,
    z: 0,
    scale: 1,
    scaleX: 1,
    scaleY: 1,
    rotate: 0,
    rotateX: 0,
    rotateY: 0,
    skewX: 0,
    skewY: 0,
  };
  if (key in defaults) return defaults[key]!;

  const cs = getComputedStyle(el);
  const raw = (cs as unknown as Record<string, string>)[key] ?? cs.getPropertyValue(key);
  return parseNumber(raw, 0);
}

/** Mix hex colors (#rgb / #rrggbb). Returns #rrggbb. */
export function mixHex(from: string, to: string, t: number): string {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  if (!a || !b) return t < 0.5 ? from : to;
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `#${toHex(r)}${toHex(g)}${toHex(bl)}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.replace("#", "").trim();
  if (h.length === 3) {
    return {
      r: parseInt(h[0]! + h[0]!, 16),
      g: parseInt(h[1]! + h[1]!, 16),
      b: parseInt(h[2]! + h[2]!, 16),
    };
  }
  if (h.length === 6) {
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }
  return null;
}

function toHex(n: number): string {
  return Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
}

export function isColorString(v: unknown): boolean {
  return typeof v === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim());
}
