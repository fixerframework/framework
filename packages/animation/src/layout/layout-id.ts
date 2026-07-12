import type { Box } from "./measure.ts";

const registry = new Map<string, { box: Box; el: HTMLElement }>();

export function publishLayoutId(id: string, el: HTMLElement, box: Box): void {
  registry.set(id, { box, el });
}

export function takeLayoutId(id: string): { box: Box; el: HTMLElement } | undefined {
  const entry = registry.get(id);
  registry.delete(id);
  return entry;
}

export function peekLayoutId(id: string): { box: Box; el: HTMLElement } | undefined {
  return registry.get(id);
}

export function clearLayoutId(id: string): void {
  registry.delete(id);
}
