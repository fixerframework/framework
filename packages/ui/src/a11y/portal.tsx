import type { ComponentChildren, VNode } from "preact";
import { createPortal } from "preact/compat";

export interface PortalProps {
  children: ComponentChildren;
  /** Target container; defaults to document.body. */
  container?: Element | null;
}

/**
 * Portal that preserves Preact context (via preact/compat createPortal).
 * Mount target is resolved synchronously so overlays appear on the same frame.
 */
export function Portal({ children, container }: PortalProps) {
  if (typeof document === "undefined") return null;
  const mount = container ?? document.body;
  return createPortal(children as VNode, mount);
}
