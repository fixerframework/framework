import type { Signal } from "@preact/signals-core";
import type { BindCheckboxProps, BindTextProps } from "@fixerframework/types/ui";
import { useSignalValue } from "../lib/use-signal-value.ts";

export type { BindCheckboxProps, BindTextProps };

/**
 * Two-way bind a string signal to Input/Textarea (prop factory).
 * Does **not** subscribe — the parent must re-render for external signal writes
 * to appear. Prefer {@link useBound} in leaf components.
 */
export function bind(sig: Signal<string>): BindTextProps {
  return {
    value: sig.value,
    onInput: (e) => {
      sig.value = (e.currentTarget as HTMLInputElement | HTMLTextAreaElement).value;
    },
  };
}

/**
 * Two-way bind a boolean signal to Checkbox/Switch (prop factory).
 * Prefer {@link useBoundChecked} when the parent does not re-render on signal writes.
 */
export function bindChecked(sig: Signal<boolean>): BindCheckboxProps {
  return {
    checked: sig.value,
    onChange: (e) => {
      sig.value = (e.currentTarget as HTMLInputElement).checked;
    },
  };
}

/**
 * Subscribing two-way bind for text inputs. Re-renders when `sig` changes
 * from any source (user input or external writes).
 */
export function useBound(sig: Signal<string>): BindTextProps {
  const value = useSignalValue(sig);
  return {
    value,
    onInput: (e) => {
      sig.value = (e.currentTarget as HTMLInputElement | HTMLTextAreaElement).value;
    },
  };
}

/**
 * Subscribing two-way bind for checkboxes/switches.
 */
export function useBoundChecked(sig: Signal<boolean>): BindCheckboxProps {
  const checked = useSignalValue(sig);
  return {
    checked,
    onChange: (e) => {
      sig.value = (e.currentTarget as HTMLInputElement).checked;
    },
  };
}
