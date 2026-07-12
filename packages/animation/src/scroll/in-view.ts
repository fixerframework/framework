export interface InViewOptions {
  root?: Element | null;
  margin?: string;
  amount?: number | "some" | "all";
  once?: boolean;
}

/**
 * Observe element intersection. Returns unsubscribe.
 */
export function observeInView(
  el: Element,
  onChange: (inView: boolean) => void,
  options: InViewOptions = {},
): () => void {
  if (typeof IntersectionObserver === "undefined") {
    onChange(true);
    return () => {};
  }

  const amount = options.amount ?? 0;
  const threshold =
    amount === "all" ? 1 : amount === "some" ? 0 : typeof amount === "number" ? amount : 0;

  let done = false;
  const io = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (!entry) return;
      const inv = entry.isIntersecting;
      onChange(inv);
      if (inv && options.once && !done) {
        done = true;
        io.disconnect();
      }
    },
    {
      root: options.root ?? null,
      rootMargin: options.margin,
      threshold,
    },
  );
  io.observe(el);
  return () => io.disconnect();
}
