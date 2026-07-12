import { useEffect, useState } from "preact/hooks";
import { observeInView, type InViewOptions } from "../scroll/in-view.ts";

export function useInView(
  ref: { current: Element | null },
  options: InViewOptions = {},
): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return observeInView(el, setInView, options);
  }, [ref, options.root, options.margin, options.amount, options.once]);

  return inView;
}
