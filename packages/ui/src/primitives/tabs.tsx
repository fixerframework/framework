import type { ComponentChildren, JSX } from "preact";
import { createContext } from "preact";
import { useContext, useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
import { useId } from "../a11y/use-id.ts";
import { useRoving } from "../a11y/use-roving.ts";
import type { TabsRootProps } from "@fixerframework/types/ui";
import { cn } from "../lib/cn.ts";

export type { TabsRootProps };

interface TabsCtx {
  value: string;
  setValue: (v: string) => void;
  tabs: string[];
  register: (id: string) => void;
  baseId: string;
}

const TabsContext = createContext<TabsCtx | null>(null);

function useTabsCtx(): TabsCtx {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tabs components must be used within Tabs.Root");
  return ctx;
}

function Root({
  value: controlled,
  defaultValue = "",
  onValueChange,
  children,
  className,
}: TabsRootProps) {
  const [tabList, setTabList] = useState<string[]>([]);
  const pending = useRef<string[]>([]);
  const [internal, setInternal] = useState(defaultValue);
  const value = controlled ?? internal;
  const baseId = useId("tabs");

  const setValue = (v: string) => {
    if (controlled === undefined) setInternal(v);
    onValueChange?.(v);
  };

  const register = (id: string) => {
    if (!pending.current.includes(id)) {
      pending.current = [...pending.current, id];
    }
  };

  useLayoutEffect(() => {
    const next = pending.current;
    pending.current = [];
    setTabList((prev) => {
      if (prev.length === next.length && prev.every((id, i) => id === next[i])) return prev;
      return next;
    });
  });

  const ctx = useMemo(
    () => ({
      value,
      setValue,
      tabs: tabList,
      register,
      baseId,
    }),
    [value, tabList, baseId],
  );

  return (
    <TabsContext.Provider value={ctx}>
      <div className={className} data-ff-tabs="">
        {children}
      </div>
    </TabsContext.Provider>
  );
}

function List({
  className,
  children,
  ...props
}: JSX.HTMLAttributes<HTMLDivElement> & { children?: ComponentChildren }) {
  const { value, setValue, tabs } = useTabsCtx();
  const index = Math.max(0, tabs.indexOf(value));
  const { onKeyDown } = useRoving({
    count: tabs.length,
    orientation: "horizontal",
    index,
    onIndexChange: (i) => {
      const id = tabs[i];
      if (id) setValue(id);
    },
  });

  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
        className,
      )}
      onKeyDown={onKeyDown}
      {...props}
    >
      {children}
    </div>
  );
}

function Trigger({
  value: tabValue,
  className,
  children,
  ...props
}: JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
  value: string;
  children?: ComponentChildren;
}) {
  const { value, setValue, register, baseId } = useTabsCtx();
  register(tabValue);
  const selected = value === tabValue;
  const triggerId = `${baseId}-tab-${tabValue}`;
  const panelId = `${baseId}-panel-${tabValue}`;

  return (
    <button
      type="button"
      role="tab"
      id={triggerId}
      aria-selected={selected}
      aria-controls={panelId}
      tabIndex={selected ? 0 : -1}
      data-state={selected ? "active" : "inactive"}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow",
        className,
      )}
      {...props}
      onClick={(e) => {
        props.onClick?.(e);
        setValue(tabValue);
      }}
    >
      {children}
    </button>
  );
}

function Content({
  value: tabValue,
  className,
  children,
  ...props
}: JSX.HTMLAttributes<HTMLDivElement> & {
  value: string;
  children?: ComponentChildren;
}) {
  const { value, baseId } = useTabsCtx();
  if (value !== tabValue) return null;
  const triggerId = `${baseId}-tab-${tabValue}`;
  const panelId = `${baseId}-panel-${tabValue}`;
  return (
    <div
      role="tabpanel"
      id={panelId}
      aria-labelledby={triggerId}
      data-state="active"
      className={cn(
        "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export const Tabs = {
  Root,
  List,
  Trigger,
  Content,
};
