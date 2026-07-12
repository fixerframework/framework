import type { JSX } from "preact";
import { useState } from "preact/hooks";
import { cn } from "../lib/cn.ts";

export interface SwitchProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "type"> {}

/** Accessible switch built on checkbox semantics + styling. */
export function Switch({
  className,
  checked: checkedProp,
  defaultChecked,
  onChange,
  ...props
}: SwitchProps) {
  const isControlled = checkedProp !== undefined;
  const [uncontrolled, setUncontrolled] = useState(Boolean(defaultChecked));
  const checked = isControlled ? Boolean(checkedProp) : uncontrolled;

  return (
    <label
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors",
        checked ? "bg-primary" : "bg-input",
        "has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50",
        className,
      )}
    >
      <input
        type="checkbox"
        role="switch"
        className="peer sr-only"
        checked={isControlled ? checkedProp : undefined}
        defaultChecked={isControlled ? undefined : defaultChecked}
        onChange={(e) => {
          if (!isControlled) {
            setUncontrolled((e.currentTarget as HTMLInputElement).checked);
          }
          onChange?.(e);
        }}
        {...props}
      />
      <span
        className={cn(
          "pointer-events-none block size-4 rounded-full bg-background shadow transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5",
        )}
        aria-hidden="true"
      />
    </label>
  );
}
