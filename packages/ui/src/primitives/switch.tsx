import type { JSX } from "preact";
import { cn } from "../lib/cn.ts";

export interface SwitchProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "type"> {}

/** Accessible switch built on checkbox semantics + styling. */
export function Switch({ className, checked, ...props }: SwitchProps) {
  return (
    <label
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors",
        checked ? "bg-primary" : "bg-input",
        "has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50",
        className,
      )}
    >
      <input type="checkbox" role="switch" className="peer sr-only" checked={checked} {...props} />
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
