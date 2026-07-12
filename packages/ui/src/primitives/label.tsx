import type { ComponentChildren, JSX } from "preact";
import { cn } from "../lib/cn.ts";

export interface LabelProps extends JSX.LabelHTMLAttributes<HTMLLabelElement> {
  children?: ComponentChildren;
}

export function Label({ className, children, ...props }: LabelProps) {
  return (
    <label
      className={cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className,
      )}
      {...props}
    >
      {children}
    </label>
  );
}
