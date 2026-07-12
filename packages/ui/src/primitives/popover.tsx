import type { ComponentChildren, JSX } from "preact";
import { createContext } from "preact";
import { useContext, useLayoutEffect, useRef, useState } from "preact/hooks";
import { Portal } from "../a11y/portal.tsx";
import { useDismiss } from "../a11y/use-dismiss.ts";
import { cn } from "../lib/cn.ts";
import { type MaybeSignal, useOpenState } from "../lib/signal-open.ts";

interface PopoverCtx {
  open: boolean;
  setOpen: (v: boolean) => void;
  triggerRef: { current: HTMLElement | null };
}

const PopoverContext = createContext<PopoverCtx | null>(null);

function usePopoverCtx(): PopoverCtx {
  const ctx = useContext(PopoverContext);
  if (!ctx) throw new Error("Popover components must be used within Popover.Root");
  return ctx;
}

export interface PopoverRootProps {
  open?: MaybeSignal<boolean>;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ComponentChildren;
}

function Root({ open, defaultOpen, onOpenChange, children }: PopoverRootProps) {
  const state = useOpenState({ open, defaultOpen, onOpenChange });
  const triggerRef = useRef<HTMLElement | null>(null);
  return (
    <PopoverContext.Provider value={{ open: state.open, setOpen: state.setOpen, triggerRef }}>
      <div className="relative inline-block">{children}</div>
    </PopoverContext.Provider>
  );
}

function Trigger({
  children,
  onClick,
  ...props
}: JSX.ButtonHTMLAttributes<HTMLButtonElement> & { children?: ComponentChildren }) {
  const { open, setOpen, triggerRef } = usePopoverCtx();
  return (
    <button
      type="button"
      ref={(el) => {
        triggerRef.current = el;
      }}
      aria-expanded={open}
      aria-haspopup="dialog"
      {...props}
      onClick={(e) => {
        onClick?.(e);
        setOpen(!open);
      }}
    >
      {children}
    </button>
  );
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function Content({
  className,
  children,
  ...props
}: JSX.HTMLAttributes<HTMLDivElement> & { children?: ComponentChildren }) {
  const { open, setOpen, triggerRef } = usePopoverCtx();
  const ref = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  useDismiss({
    open,
    onDismiss: () => setOpen(false),
    rootRef: ref,
    outside: true,
    escape: true,
  });

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }

    const place = () => {
      const trigger = triggerRef.current;
      const panel = ref.current;
      if (!trigger || !panel || typeof trigger.getBoundingClientRect !== "function") return;
      const tr = trigger.getBoundingClientRect();
      const pr = panel.getBoundingClientRect();
      const gap = 6;
      let top = tr.bottom + gap;
      let left = tr.left;

      // Flip above if not enough room below
      if (top + pr.height > window.innerHeight - 8 && tr.top - gap - pr.height > 8) {
        top = tr.top - gap - pr.height;
      }
      left = clamp(left, 8, Math.max(8, window.innerWidth - pr.width - 8));
      top = clamp(top, 8, Math.max(8, window.innerHeight - pr.height - 8));
      setCoords({ top, left });
    };

    place();
    // Second pass after layout settles (panel measured)
    const raf = requestAnimationFrame(place);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, triggerRef]);

  if (!open) return null;

  return (
    <Portal>
      <div
        ref={ref}
        role="dialog"
        data-ff-popover=""
        style={
          coords
            ? {
                position: "fixed",
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                zIndex: 50,
              }
            : { position: "fixed", top: 0, left: 0, zIndex: 50, visibility: "hidden" }
        }
        className={cn(
          "w-72 rounded-md border border-border bg-popover p-4 text-popover-foreground shadow-md outline-none",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </Portal>
  );
}

export const Popover = {
  Root,
  Trigger,
  Content,
};
