import type { ComponentChildren, JSX } from "preact";
import { createContext } from "preact";
import { useContext, useEffect, useRef } from "preact/hooks";
import { AnimatePresence, motion } from "@fixerframework/animation";
import { Portal } from "../a11y/portal.tsx";
import { trapFocus } from "../a11y/focus-trap.ts";
import { useDismiss } from "../a11y/use-dismiss.ts";
import { useId } from "../a11y/use-id.ts";
import { cn } from "../lib/cn.ts";
import { type MaybeSignal, useOpenState } from "../lib/signal-open.ts";

interface DialogCtx {
  open: boolean;
  setOpen: (v: boolean) => void;
  titleId: string;
  descriptionId: string;
}

const DialogContext = createContext<DialogCtx | null>(null);

function useDialogCtx(): DialogCtx {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("Dialog components must be used within Dialog.Root");
  return ctx;
}

export interface DialogRootProps {
  open?: MaybeSignal<boolean>;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ComponentChildren;
}

function Root({ open, defaultOpen, onOpenChange, children }: DialogRootProps) {
  const state = useOpenState({ open, defaultOpen, onOpenChange });
  const titleId = useId("dialog-title");
  const descriptionId = useId("dialog-desc");

  return (
    <DialogContext.Provider
      value={{
        open: state.open,
        setOpen: state.setOpen,
        titleId,
        descriptionId,
      }}
    >
      {children}
    </DialogContext.Provider>
  );
}

export interface DialogTriggerProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ComponentChildren;
}

function Trigger({ children, onClick, ...props }: DialogTriggerProps) {
  const { setOpen } = useDialogCtx();
  return (
    <button
      type="button"
      {...props}
      onClick={(e) => {
        onClick?.(e);
        setOpen(true);
      }}
    >
      {children}
    </button>
  );
}

export interface DialogContentProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children?: ComponentChildren;
}

function Content({ className, children, ...props }: DialogContentProps) {
  const { open, setOpen, titleId, descriptionId } = useDialogCtx();
  const panelRef = useRef<HTMLDivElement>(null);

  useDismiss({
    open,
    onDismiss: () => setOpen(false),
    rootRef: panelRef,
    outside: true,
    escape: true,
  });

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel || typeof panel.querySelectorAll !== "function") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const release = trapFocus(panel);
    return () => {
      document.body.style.overflow = prev;
      release();
    };
  }, [open]);

  return (
    <Portal>
      <AnimatePresence>
        {open ? (
          <motion.div
            key="ff-dialog"
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "tween", duration: 0.15, ease: "easeOut" }}
          >
            <div
              className="fixed inset-0 bg-black/50"
              aria-hidden="true"
              data-ff-dialog-overlay=""
            />
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-describedby={descriptionId}
              tabIndex={-1}
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className={cn(
                "relative z-50 grid w-full max-w-lg gap-4 border border-border bg-background p-6 shadow-lg sm:rounded-lg",
                className,
              )}
              {...(props as Record<string, unknown>)}
            >
              {children}
              <button
                type="button"
                className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="Close"
                onClick={() => setOpen(false)}
              >
                <span aria-hidden="true">×</span>
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Portal>
  );
}

function Title({
  className,
  children,
  ...props
}: JSX.HTMLAttributes<HTMLHeadingElement> & { children?: ComponentChildren }) {
  const { titleId } = useDialogCtx();
  return (
    <h2
      id={titleId}
      className={cn("text-lg font-semibold leading-none tracking-tight", className)}
      {...props}
    >
      {children}
    </h2>
  );
}

function Description({
  className,
  children,
  ...props
}: JSX.HTMLAttributes<HTMLParagraphElement> & { children?: ComponentChildren }) {
  const { descriptionId } = useDialogCtx();
  return (
    <p id={descriptionId} className={cn("text-sm text-muted-foreground", className)} {...props}>
      {children}
    </p>
  );
}

function Close({
  className,
  children,
  onClick,
  ...props
}: JSX.ButtonHTMLAttributes<HTMLButtonElement> & { children?: ComponentChildren }) {
  const { setOpen } = useDialogCtx();
  return (
    <button
      type="button"
      className={className}
      {...props}
      onClick={(e) => {
        onClick?.(e);
        setOpen(false);
      }}
    >
      {children}
    </button>
  );
}

export const Dialog = {
  Root,
  Trigger,
  Content,
  Title,
  Description,
  Close,
};
