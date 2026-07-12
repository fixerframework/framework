import type { ComponentChildren, JSX } from "preact";
import { createContext } from "preact";
import { useContext, useRef } from "preact/hooks";
import { Portal } from "../a11y/portal.tsx";
import { useDismiss } from "../a11y/use-dismiss.ts";
import { cn } from "../lib/cn.ts";
import { type MaybeSignal, useOpenState } from "../lib/signal-open.ts";

interface PopoverCtx {
  open: boolean;
  setOpen: (v: boolean) => void;
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
  return (
    <PopoverContext.Provider value={{ open: state.open, setOpen: state.setOpen }}>
      <div className="relative inline-block">{children}</div>
    </PopoverContext.Provider>
  );
}

function Trigger({
  children,
  onClick,
  ...props
}: JSX.ButtonHTMLAttributes<HTMLButtonElement> & { children?: ComponentChildren }) {
  const { open, setOpen } = usePopoverCtx();
  return (
    <button
      type="button"
      aria-expanded={open}
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

function Content({
  className,
  children,
  ...props
}: JSX.HTMLAttributes<HTMLDivElement> & { children?: ComponentChildren }) {
  const { open, setOpen } = usePopoverCtx();
  const ref = useRef<HTMLDivElement>(null);

  useDismiss({
    open,
    onDismiss: () => setOpen(false),
    rootRef: ref,
    outside: true,
    escape: true,
  });

  if (!open) return null;

  return (
    <Portal>
      <div
        ref={ref}
        role="dialog"
        className={cn(
          "z-50 w-72 rounded-md border border-border bg-popover p-4 text-popover-foreground shadow-md outline-none",
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
