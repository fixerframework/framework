export function bindPress(
  el: HTMLElement,
  onStart: (e: PointerEvent) => void,
  onEnd: (e: PointerEvent) => void,
): () => void {
  const down = (e: PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    onStart(e);
    const up = (ev: PointerEvent) => {
      onEnd(ev);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };
  el.addEventListener("pointerdown", down);
  return () => el.removeEventListener("pointerdown", down);
}
