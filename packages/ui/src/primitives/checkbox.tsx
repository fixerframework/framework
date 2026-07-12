import type { CheckboxProps } from "@fixerframework/types/ui";
import { cn } from "../lib/cn.ts";

export type { CheckboxProps };

export function Checkbox({ className, ...props }: CheckboxProps) {
  return (
    <input
      type="checkbox"
      className={cn(
        "size-4 shrink-0 rounded border border-input text-primary shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
