import { useEffect, useMemo } from "preact/hooks";
import { createScrollMotionValues, type UseScrollOptions } from "../scroll/scroll.ts";

export function useScroll(options: UseScrollOptions = {}) {
  const values = useMemo(
    () =>
      createScrollMotionValues({
        target: options.target,
        container: options.container,
        offset: options.offset,
        axis: options.axis,
      }),
    // re-create when target identity changes is hard; consumers pass stable refs
    [],
  );

  useEffect(() => {
    return () => values.destroy();
  }, [values]);

  return {
    scrollX: values.scrollX,
    scrollY: values.scrollY,
    scrollXProgress: values.scrollXProgress,
    scrollYProgress: values.scrollYProgress,
  };
}
