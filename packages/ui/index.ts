/**
 * @fixerframework/ui — Preact primitives + state bridges
 *
 * Custom Preact components with a shadcn-like design language (tokens, cva, cn).
 * Not React shadcn / Radix / Base UI — owned primitives integrated with
 * `@fixerframework/state` signals.
 *
 * ```ts
 * import { createState } from '@fixerframework/state'
 * import {
 *   Button, Input, Dialog, Show, Await, bind, cn,
 * } from '@fixerframework/ui'
 * import type { ButtonProps, AwaitProps } from '@fixerframework/types/ui'
 * import '@fixerframework/ui/theme.css'
 * ```
 */

export { cn } from "./src/lib/cn.ts";
export { isSignal, readMaybeSignal } from "./src/lib/signal-open.ts";

export { Button, buttonVariants } from "./src/primitives/button.tsx";
export { Input } from "./src/primitives/input.tsx";
export { Textarea } from "./src/primitives/textarea.tsx";
export { Label } from "./src/primitives/label.tsx";
export { Checkbox } from "./src/primitives/checkbox.tsx";
export { Switch } from "./src/primitives/switch.tsx";
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./src/primitives/card.tsx";
export { Badge, badgeVariants } from "./src/primitives/badge.tsx";
export {
  Alert,
  AlertTitle,
  AlertDescription,
  alertVariants,
} from "./src/primitives/alert.tsx";
export { Separator } from "./src/primitives/separator.tsx";
export { Skeleton } from "./src/primitives/skeleton.tsx";
export { Dialog } from "./src/primitives/dialog.tsx";
export { Popover } from "./src/primitives/popover.tsx";
export { Tooltip } from "./src/primitives/tooltip.tsx";
export { Select } from "./src/primitives/select.tsx";
export { Tabs } from "./src/primitives/tabs.tsx";

export { Show } from "./src/state/show.tsx";
export { Await } from "./src/state/await.tsx";
export {
  bind,
  bindChecked,
  useBound,
  useBoundChecked,
} from "./src/state/bind.ts";
export { Match } from "./src/state/match.tsx";
