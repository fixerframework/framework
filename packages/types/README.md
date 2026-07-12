# `@fixerframework/types`

Shared **public TypeScript types** for FixerFramework. Runtime code lives in domain packages; import types only from here.

## Install

```bash
bun add @fixerframework/types
```

Registry: `https://registry.fixerframework.com` (scope `@fixerframework`).

## Usage

```ts
import type { AuthRuntime, QueryDef, ButtonProps } from "@fixerframework/types";

// Domain subpaths (optional)
import type { QueryDef } from "@fixerframework/types/state";
import type { DeployAdapter } from "@fixerframework/types/adapters";
```

Values still come from the owning package:

```ts
import { createState } from "@fixerframework/state";
import { Button } from "@fixerframework/ui";
```

## Subpaths

| Export | Domain |
|--------|--------|
| `@fixerframework/types` | All public types |
| `@fixerframework/types/auth` | Client auth contract |
| `@fixerframework/types/auth/server` | Server auth types |
| `@fixerframework/types/state` | Store / query types |
| `@fixerframework/types/db` | SQL core contracts |
| `@fixerframework/types/db/drivers` | Driver configs |
| `@fixerframework/types/router` | Router types |
| `@fixerframework/types/animation` | Motion types |
| `@fixerframework/types/adapters` | Deploy adapters |
| `@fixerframework/types/ui` | Component props |
| `@fixerframework/types/utils` | Utility types |
| `@fixerframework/types/bundler` | CLI / Vite config types |

## Peers

Optional peers for type positions only: `preact`, `@preact/signals-core`, `vite`, `vitest`, `@clerk/backend`. Install the ones your import path needs.
