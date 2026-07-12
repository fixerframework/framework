import type { ComponentChildren, JSX } from "preact";
import { createContext } from "preact";
import { useContext, useId, useRef, useState } from "preact/hooks";
import { useDismiss } from "../a11y/use-dismiss.ts";
import { cn } from "../lib/cn.ts";

interface SelectCtx {
  open: boolean;
  setOpen: (v: boolean) => void;
  value: string | undefined;
  setValue: (v: string) => void;
  labelId: string;
  listboxId: string;
}

const SelectContext = createContext<SelectCtx | null>(null);

function useSelectCtx(): SelectCtx {
  const ctx = useContext(SelectContext);
  if (!ctx) throw new Error("Select components must be used within Select.Root");
  return ctx;
}

export interface SelectRootProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children?: ComponentChildren;
}

function Root({ value: controlled, defaultValue, onValueChange, children }: SelectRootProps) {
  const [open, setOpen] = useState(false);
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const value = controlled ?? uncontrolled;
  const labelId = useId();
  const listboxId = useId();

  const setValue = (v: string) => {
    if (controlled === undefined) setUncontrolled(v);
    onValueChange?.(v);
    setOpen(false);
  };

  return (
    <SelectContext.Provider value={{ open, setOpen, value, setValue, labelId, listboxId }}>
      <div className="relative inline-block w-full">{children}</div>
    </SelectContext.Provider>
  );
}

function Trigger({
  className,
  placeholder = "Select…",
  children,
  ...props
}: JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: ComponentChildren;
  placeholder?: string;
}) {
  const { open, setOpen, value, labelId, listboxId } = useSelectCtx();
  return (
    <button
      type="button"
      role="combobox"
      aria-expanded={open}
      aria-controls={listboxId}
      aria-labelledby={labelId}
      className={cn(
        "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
      onClick={(e) => {
        props.onClick?.(e);
        setOpen(!open);
      }}
    >
      <span className={cn(!value && "text-muted-foreground")}>
        {children ?? value ?? placeholder}
      </span>
      <span aria-hidden="true" className="opacity-50">
        ▾
      </span>
    </button>
  );
}

function Content({
  className,
  children,
  ...props
}: JSX.HTMLAttributes<HTMLDivElement> & { children?: ComponentChildren }) {
  const { open, setOpen, listboxId } = useSelectCtx();
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
    <div
      ref={ref}
      id={listboxId}
      role="listbox"
      className={cn(
        "absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function Item({
  value,
  className,
  children,
  ...props
}: JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
  value: string;
  children?: ComponentChildren;
}) {
  const { value: selected, setValue } = useSelectCtx();
  const isSelected = selected === value;

  return (
    <button
      type="button"
      role="option"
      aria-selected={isSelected}
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        isSelected && "bg-accent",
        className,
      )}
      {...props}
      onClick={(e) => {
        props.onClick?.(e);
        setValue(value);
      }}
    >
      {children}
      {isSelected ? (
        <span className="absolute right-2" aria-hidden="true">
          ✓
        </span>
      ) : null}
    </button>
  );
}

function Value({ placeholder }: { placeholder?: string }) {
  const { value } = useSelectCtx();
  return <>{value ?? placeholder}</>;
}

export const Select = {
  Root,
  Trigger,
  Content,
  Item,
  Value,
};
