import type { Signal } from "@preact/signals-core";
import type { JSX } from "preact";

export interface BindTextProps {
  value: string;
  onInput: JSX.InputEventHandler<HTMLInputElement | HTMLTextAreaElement>;
}

export interface BindCheckboxProps {
  checked: boolean;
  onChange: JSX.GenericEventHandler<HTMLInputElement>;
}

/**
 * Two-way bind a string signal to Input/Textarea.
 * Reads `.value` during render so the parent tracks updates when using
 * `useSignalValue`/subscriptions or re-renders on input events.
 */
export function bind(sig: Signal<string>): BindTextProps {
  return {
    value: sig.value,
    onInput: (e) => {
      sig.value = (e.currentTarget as HTMLInputElement | HTMLTextAreaElement).value;
    },
  };
}

/** Two-way bind a boolean signal to Checkbox/Switch. */
export function bindChecked(sig: Signal<boolean>): BindCheckboxProps {
  return {
    checked: sig.value,
    onChange: (e) => {
      sig.value = (e.currentTarget as HTMLInputElement).checked;
    },
  };
}
