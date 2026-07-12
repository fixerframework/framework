import { useId as usePreactId } from "preact/hooks";

/**
 * Stable unique id for a11y associations (label/control, dialog title, …).
 * Wraps Preact's `useId` so ids are stable for the component instance lifetime.
 */
export function useId(prefix = "ff"): string {
  const raw = usePreactId();
  // Preact may emit ids with `:` which are awkward in some selectors.
  const safe = raw.replace(/:/g, "");
  return prefix ? `${prefix}-${safe}` : safe;
}
