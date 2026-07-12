export function bindHover(
  el: HTMLElement,
  onStart: () => void,
  onEnd: () => void,
): () => void {
  const enter = () => onStart();
  const leave = () => onEnd();
  el.addEventListener("pointerenter", enter);
  el.addEventListener("pointerleave", leave);
  // mouseenter/leave for environments with incomplete PointerEvent support
  el.addEventListener("mouseenter", enter);
  el.addEventListener("mouseleave", leave);
  return () => {
    el.removeEventListener("pointerenter", enter);
    el.removeEventListener("pointerleave", leave);
    el.removeEventListener("mouseenter", enter);
    el.removeEventListener("mouseleave", leave);
  };
}
