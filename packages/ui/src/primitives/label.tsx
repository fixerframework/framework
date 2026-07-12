import type { LabelProps } from "@fixerframework/types/ui";
import { cn } from "../lib/cn.ts";

export type { LabelProps };

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
