/**
 * Stagger helper: delay for child index.
 * @param seconds delay between children
 * @param options.from start index offset; options.ease unused in v1
 */
export function stagger(
  seconds = 0.05,
  options?: { from?: number | "first" | "last" | "center"; startDelay?: number },
): (index: number, total: number) => number {
  const startDelay = options?.startDelay ?? 0;
  return (index: number, total: number) => {
    let i = index;
    const from = options?.from ?? 0;
    if (from === "last") i = total - 1 - index;
    else if (from === "center") {
      const mid = (total - 1) / 2;
      i = Math.abs(index - mid);
    } else if (typeof from === "number") {
      i = Math.abs(index - from);
    }
    return startDelay + i * seconds;
  };
}
