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
 * import '@fixerframework/ui/theme.css'
 *
 * const state = createState({ auth })
 * const open = state.atom(false)
 * const name = state.atom('')
 * const projects = state.query({
 *   key: ['projects'],
 *   scope: 'user',
 *   fetch: ({ token }) => api.get('/projects', { token }),
 * })
 *
 * <Button onClick={() => { open.value = true }}>Open</Button>
 * <Input {...bind(name)} />
 * <Show when={open}>
 *   {() => (
 *     <Dialog.Root open={open} onOpenChange={(v) => { open.value = v }}>
 *       <Dialog.Content>
 *         <Dialog.Title>Hello</Dialog.Title>
 *       </Dialog.Content>
 *     </Dialog.Root>
 *   )}
 * </Show>
 * <Await query={projects} pending={() => <Skeleton />}>
 *   {(data) => <ul>{data.map(...)}</ul>}
 * </Await>
 * ```
 */

export { cn } from "./src/lib/cn.ts";
export { isSignal, readMaybeSignal, type MaybeSignal } from "./src/lib/signal-open.ts";

export { Button, buttonVariants, type ButtonProps } from "./src/primitives/button.tsx";
export { Input, type InputProps } from "./src/primitives/input.tsx";
export { Textarea, type TextareaProps } from "./src/primitives/textarea.tsx";
export { Label, type LabelProps } from "./src/primitives/label.tsx";
export { Checkbox, type CheckboxProps } from "./src/primitives/checkbox.tsx";
export { Switch, type SwitchProps } from "./src/primitives/switch.tsx";
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  type CardProps,
} from "./src/primitives/card.tsx";
export { Badge, badgeVariants, type BadgeProps } from "./src/primitives/badge.tsx";
export {
  Alert,
  AlertTitle,
  AlertDescription,
  alertVariants,
  type AlertProps,
} from "./src/primitives/alert.tsx";
export { Separator, type SeparatorProps } from "./src/primitives/separator.tsx";
export { Skeleton, type SkeletonProps } from "./src/primitives/skeleton.tsx";
export { Dialog, type DialogRootProps, type DialogContentProps } from "./src/primitives/dialog.tsx";
export { Popover, type PopoverRootProps } from "./src/primitives/popover.tsx";
export { Tooltip } from "./src/primitives/tooltip.tsx";
export { Select, type SelectRootProps } from "./src/primitives/select.tsx";
export { Tabs, type TabsRootProps } from "./src/primitives/tabs.tsx";

export { Show, type ShowProps, type ShowWhen } from "./src/state/show.tsx";
export { Await, type AwaitProps } from "./src/state/await.tsx";
export {
  bind,
  bindChecked,
  useBound,
  useBoundChecked,
  type BindTextProps,
  type BindCheckboxProps,
} from "./src/state/bind.ts";
export { Match, type MatchProps, type MatchValue } from "./src/state/match.tsx";
