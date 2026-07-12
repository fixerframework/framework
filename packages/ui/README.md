# `@fixerframework/ui`

Preact UI primitives and state bridges (`Show`, `Await`, `Match`, `useBound`).

```bash
bun add @fixerframework/ui
```

## Setup

```ts
import "@fixerframework/ui/theme.css";
import { Button, Dialog, useBound, Await } from "@fixerframework/ui";
```

**Tailwind v4:** component classes are utilities. Point Tailwind `content` at your app **and** at the package source/dist so classes are generated. Tokens live in `theme.css` (`@theme inline` + `.dark`).

## Forms (signals)

Prefer **subscribing** hooks so external signal writes update the DOM:

```tsx
import { signal } from "@preact/signals-core";
import { Input, useBound } from "@fixerframework/ui";

const name = signal("");
function NameField() {
  return <Input {...useBound(name)} />;
}
```

`bind` / `bindChecked` are prop factories (no subscription) — use only when the parent already re-renders on signal changes.

## Overlays

- **Dialog** — portal, focus trap, Escape/outside dismiss, optional Description (`aria-describedby` only when present)
- **Popover** — portaled and **positioned under the trigger** (fixed + viewport clamp)
- **Select** — combobox + listbox keyboard (arrows/Home/End/Enter)
- **Tabs** — roving tabindex + `aria-controls` / panel ids

## Non-goals (v1)

- React / shadcn CLI / Radix
- SSR/hydration helpers
- Full shadcn component parity
