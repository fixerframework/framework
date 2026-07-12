import { createContext } from "preact";

export interface PresenceContextValue {
  /** Whether this subtree is still considered present (entering or shown). */
  isPresent: boolean;
  /**
   * Register as an exiting participant for this presence child.
   * Call `safeToRemove` when this participant's exit animation finishes.
   * All registered participants must finish before the child unmounts.
   */
  register: () => { safeToRemove: () => void };
}

export const PresenceContext = createContext<PresenceContextValue | null>(null);
