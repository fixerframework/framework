import type { ComponentChildren, JSX } from "preact";
import { createContext } from "preact";
import { useContext, useRef, useState } from "preact/hooks";
import { cn } from "../lib/cn.ts";

interface TooltipCtx {
  open: boolean;
  setOpen: (v: boolean) => void;
}

const TooltipContext = createContext<TooltipCtx | null>(null);

function useTooltipCtx(): TooltipCtx {
  const ctx = useContext(TooltipContext);
  if (!ctx) throw new Error("Tooltip components must be used within Tooltip.Root");
  return ctx;
}

function Root({ children }: { children?: ComponentChildren }) {
  const [open, setOpen] = useState(false);
  return (
    <TooltipContext.Provider value={{ open, setOpen }}>
      <span className="relative inline-flex">{children}</span>
    </TooltipContext.Provider>
  );
}

function Trigger({
  children,
  ...props
}: JSX.HTMLAttributes<HTMLSpanElement> & { children?: ComponentChildren }) {
  const { setOpen } = useTooltipCtx();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  return (
    <span
      {...props}
      onMouseEnter={() => {
        clear();
        timer.current = setTimeout(() => setOpen(true), 200);
      }}
      onMouseLeave={() => {
        clear();
        setOpen(false);
      }}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
    </span>
  );
}

function Content({
  className,
  children,
  ...props
}: JSX.HTMLAttributes<HTMLSpanElement> & { children?: ComponentChildren }) {
  const { open } = useTooltipCtx();
  if (!open) return null;
  return (
    <span
      role="tooltip"
      className={cn(
        "absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground shadow-md",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export const Tooltip = {
  Root,
  Trigger,
  Content,
};
