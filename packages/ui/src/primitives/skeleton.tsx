import type { JSX } from "preact";
import { cn } from "../lib/cn.ts";

export interface SkeletonProps extends JSX.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-primary/10", className)}
      aria-hidden="true"
      {...props}
    />
  );
}
