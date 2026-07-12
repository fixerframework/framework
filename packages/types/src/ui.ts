import type { ComponentChildren, JSX } from "preact";
import type { ReadonlySignal, Signal } from "@preact/signals-core";
import type { Query } from "./state.ts";

export type MaybeSignal<T> = T | Signal<T>;

export type ShowWhen<T> = T | Signal<T> | ReadonlySignal<T>;

export interface ShowProps<T> {
  /** Plain value or signal; truthy values render children. */
  when: ShowWhen<T>;
  /** Rendered when `when` is falsy. */
  fallback?: ComponentChildren;
  children: ComponentChildren | ((value: NonNullable<T>) => ComponentChildren);
}

export interface AwaitProps<T> {
  query: Query<T>;
  /** Shown while status is idle/pending and data is undefined. */
  pending?: ComponentChildren | (() => ComponentChildren);
  /** Shown when status is error and no data is available. */
  error?: ComponentChildren | ((err: unknown) => ComponentChildren);
  children: (data: T) => ComponentChildren;
}

export type MatchValue<T extends string | number | symbol> = T | Signal<T> | ReadonlySignal<T>;

export interface MatchProps<T extends string | number | symbol> {
  value: MatchValue<T>;
  children: Partial<Record<T, ComponentChildren | (() => ComponentChildren)>> & {
    /** Fallback when no case matches. */
    _?: ComponentChildren | (() => ComponentChildren);
  };
}

export interface BindTextProps {
  value: string;
  onInput: JSX.InputEventHandler<HTMLInputElement | HTMLTextAreaElement>;
}

export interface BindCheckboxProps {
  checked: boolean;
  onChange: JSX.GenericEventHandler<HTMLInputElement>;
}

export type ButtonVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "link";

export type ButtonSize = "default" | "sm" | "lg" | "icon";

export interface ButtonProps
  extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "size"> {
  children?: ComponentChildren;
  variant?: ButtonVariant | null;
  size?: ButtonSize | null;
  /** Show busy state (sets aria-busy + disabled). */
  loading?: boolean;
}

export interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {}

export interface TextareaProps extends JSX.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export interface LabelProps extends JSX.LabelHTMLAttributes<HTMLLabelElement> {
  children?: ComponentChildren;
}

export interface CheckboxProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "type"> {}

export interface SwitchProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "type"> {}

export interface CardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children?: ComponentChildren;
}

export type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

export interface BadgeProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children?: ComponentChildren;
  variant?: BadgeVariant | null;
}

export type AlertVariant = "default" | "destructive";

export interface AlertProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children?: ComponentChildren;
  variant?: AlertVariant | null;
}

export interface SeparatorProps extends JSX.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
  decorative?: boolean;
}

export interface SkeletonProps extends JSX.HTMLAttributes<HTMLDivElement> {}

export interface DialogRootProps {
  open?: MaybeSignal<boolean>;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ComponentChildren;
}

export interface DialogContentProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children?: ComponentChildren;
}

export interface PopoverRootProps {
  open?: MaybeSignal<boolean>;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ComponentChildren;
}

export interface SelectRootProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children?: ComponentChildren;
}

export interface TabsRootProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children?: ComponentChildren;
  className?: string;
}
