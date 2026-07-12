let seq = 0;

/** Stable unique id for a11y associations (label/control, dialog title, …). */
export function useId(prefix = "ff"): string {
  return `${prefix}-${++seq}`;
}

/** Test-only reset. */
export function resetIdSeq(): void {
  seq = 0;
}
