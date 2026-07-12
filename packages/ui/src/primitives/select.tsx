import type { ComponentChildren, JSX } from "preact";
import { createContext } from "preact";
import { useCallback, useContext, useEffect, useId, useRef, useState } from "preact/hooks";
import { useDismiss } from "../a11y/use-dismiss.ts";
import type { SelectRootProps } from "@fixerframework/types/ui";
import { cn } from "../lib/cn.ts";

export type { SelectRootProps };

interface SelectItem {
  value: string;
  label: string;
}

interface SelectCtx {
  open: boolean;
  setOpen: (v: boolean) => void;
  value: string | undefined;
  setValue: (v: string) => void;
  labelId: string;
  listboxId: string;
  items: SelectItem[];
  registerItem: (item: SelectItem) => void;
  activeIndex: number;
  setActiveIndex: (i: number) => void;
}

const SelectContext = createContext<SelectCtx | null>(null);

function useSelectCtx(): SelectCtx {
  const ctx = useContext(SelectContext);
  if (!ctx) throw new Error("Select components must be used within Select.Root");
  return ctx;
}

function Root({ value: controlled, defaultValue, onValueChange, children }: SelectRootProps) {
  const [open, setOpen] = useState(false);
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const value = controlled ?? uncontrolled;
  const labelId = useId();
  const listboxId = useId();
  const itemsRef = useRef<SelectItem[]>([]);
  const [, bump] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const setValue = (v: string) => {
    if (controlled === undefined) setUncontrolled(v);
    onValueChange?.(v);
    setOpen(false);
  };

  const registerItem = useCallback((item: SelectItem) => {
    const existing = itemsRef.current.findIndex((i) => i.value === item.value);
    if (existing === -1) {
      itemsRef.current.push(item);
      bump((n) => n + 1);
    } else if (itemsRef.current[existing]!.label !== item.label) {
      itemsRef.current[existing] = item;
      bump((n) => n + 1);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const idx = itemsRef.current.findIndex((i) => i.value === value);
    setActiveIndex(idx >= 0 ? idx : 0);
  }, [open, value]);

  return (
    <SelectContext.Provider
      value={{
        open,
        setOpen,
        value,
        setValue,
        labelId,
        listboxId,
        items: itemsRef.current,
        registerItem,
        activeIndex,
        setActiveIndex,
      }}
    >
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
  const { open, setOpen, value, labelId, listboxId, items, activeIndex, setActiveIndex, setValue } =
    useSelectCtx();
  const selected = items.find((i) => i.value === value);
  const display = children ?? selected?.label ?? value ?? placeholder;

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (e.key === "ArrowDown") {
        setActiveIndex(Math.min(items.length - 1, activeIndex + 1));
      } else if (e.key === "ArrowUp") {
        setActiveIndex(Math.max(0, activeIndex - 1));
      } else if (e.key === "Enter" || e.key === " ") {
        const item = items[activeIndex];
        if (item) setValue(item.value);
      }
    } else if (e.key === "Home" && open) {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "End" && open) {
      e.preventDefault();
      setActiveIndex(Math.max(0, items.length - 1));
    }
  };

  return (
    <button
      type="button"
      role="combobox"
      aria-expanded={open}
      aria-controls={listboxId}
      aria-labelledby={labelId}
      aria-autocomplete="none"
      className={cn(
        "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
      onClick={(e) => {
        props.onClick?.(e);
        setOpen(!open);
      }}
      onKeyDown={(e) => {
        props.onKeyDown?.(e as unknown as JSX.TargetedKeyboardEvent<HTMLButtonElement>);
        onKeyDown(e as unknown as KeyboardEvent);
      }}
    >
      <span id={labelId} className={cn(!value && "text-muted-foreground")}>
        {display}
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
  const { open, setOpen, listboxId, activeIndex, setActiveIndex, items, setValue } = useSelectCtx();
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
      tabIndex={-1}
      className={cn(
        "absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md",
        className,
      )}
      onKeyDown={(e) => {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setActiveIndex(Math.min(items.length - 1, activeIndex + 1));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setActiveIndex(Math.max(0, activeIndex - 1));
        } else if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          const item = items[activeIndex];
          if (item) setValue(item.value);
        } else if (e.key === "Home") {
          e.preventDefault();
          setActiveIndex(0);
        } else if (e.key === "End") {
          e.preventDefault();
          setActiveIndex(Math.max(0, items.length - 1));
        }
      }}
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
  const {
    value: selected,
    setValue,
    registerItem,
    activeIndex,
    items,
    setActiveIndex,
  } = useSelectCtx();
  const isSelected = selected === value;
  const label =
    typeof children === "string" || typeof children === "number" ? String(children) : value;

  useEffect(() => {
    registerItem({ value, label });
  }, [value, label, registerItem]);

  const index = items.findIndex((i) => i.value === value);
  const isActive = index === activeIndex;
  const optionId = `ff-select-opt-${value}`;

  return (
    <button
      type="button"
      id={optionId}
      role="option"
      aria-selected={isSelected}
      data-active={isActive ? "true" : undefined}
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        isSelected && "bg-accent",
        isActive && "ring-2 ring-ring",
        className,
      )}
      {...props}
      onMouseEnter={() => {
        if (index >= 0) setActiveIndex(index);
      }}
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
  const { value, items } = useSelectCtx();
  const selected = items.find((i) => i.value === value);
  return <>{selected?.label ?? value ?? placeholder}</>;
}

export const Select = {
  Root,
  Trigger,
  Content,
  Item,
  Value,
};
