import { signal, type Signal } from "@preact/signals-core";
import type { Registry } from "../core/registry.ts";

export interface AtomOptions {
  id?: string;
}

export function createAtom<T>(registry: Registry, initial: T, opts?: AtomOptions): Signal<T> {
  const id = opts?.id ?? registry.nextId("atom");
  const existing = registry.get<Signal<T>>(id);
  if (existing) return existing;

  const s = signal(initial);
  registry.set(id, s);
  return s;
}
