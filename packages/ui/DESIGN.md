# @fixerframework/ui — Preact primitives + state

> Custom Preact component library with a shadcn-like design language, first-class `@fixerframework/state` integration. No React, Radix, Base UI, or shadcn CLI.

## Layers

| Layer      | Path                            | Role                                                                                    |
| ---------- | ------------------------------- | --------------------------------------------------------------------------------------- |
| Utils      | `src/lib/`                      | `cn()`, signal helpers                                                                  |
| Theme      | `src/styles/theme.css`          | CSS variables (light + `.dark`)                                                         |
| A11y       | `src/a11y/`                     | Portal (`preact/compat` createPortal for context), focus trap, dismiss, roving tabindex |
| Primitives | `src/primitives/`               | Styled Preact components                                                                |
| State      | `src/state/`                    | `Show`, `Await`, `bind`, `Match`                                                        |
| Motion     | via `@fixerframework/animation` | Enter/exit for overlays (`Dialog` uses `AnimatePresence` + `motion`)                    |

**Dependency direction:** `ui` → `state` → `auth`; `ui` → `animation`. No cycles.

## Design language

- Tailwind utility classes + CSS variables (shadcn new-york spirit)
- `class-variance-authority` for variants
- Compound components (`Dialog.Root`, `Tabs.Trigger`, …)
- Controlled props **or** `@preact/signals-core` `Signal` for open state

## State bridges

- **`Show`** — truthy gate on a signal/value
- **`Await`** — branch on `Query` status/data
- **`useBound` / `useBoundChecked`** — subscribing two-way form binding (production)
- **`bind` / `bindChecked`** — non-subscribing prop factories (parent must re-render)
- **`Match`** — discriminant render on status-like signals

State bridges subscribe via `useSignalValue` / `useOpenState` (signals-core `subscribe`) so components re-render without a Babel signals transform.

## Overlay a11y baseline

- **Dialog** — `aria-labelledby`; `aria-describedby` only when `Description` mounts
- **Popover** — portaled + positioned to trigger (`position: fixed` + clamp)
- **Select** — combobox/listbox keyboard navigation; item labels for display
- **Tabs** — registration + `aria-controls` / panel ids; roving tabindex

## Non-goals (v1)

- React compat layer / shadcn CLI / registry
- SSR/hydration helpers
- Full shadcn component parity
- `createFixerApp()` (see state DESIGN.md v2)

## Usage

```ts
import "@fixerframework/ui/theme.css";
import { Button, Await, Show, bind } from "@fixerframework/ui";
```
