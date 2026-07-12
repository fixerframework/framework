import type { SkeletonProps } from "@fixerframework/types/ui";
import { cn } from "../lib/cn.ts";

export type { SkeletonProps };

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-primary/10", className)}
      aria-hidden="true"
      {...props}
    />
  );
}
