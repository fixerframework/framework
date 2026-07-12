# `@fixerframework/router`

Declarative SPA router for Preact: nested layouts, loaders, signals-based location.

```bash
bun add @fixerframework/router
```

## Quick start

```tsx
import { render } from "preact";
import {
  createRouter,
  Router,
  Link,
  Outlet,
  useLoaderData,
  useParams,
  useNavigation,
  redirect,
} from "@fixerframework/router";

const router = createRouter({
  history: "browser",
  // base: "/app", // subpath deploys — history/Link include base; location.pathname does not
  routes: [
    {
      path: "/",
      component: Layout,
      children: [
        { index: true, path: "", component: Home },
        {
          path: "posts/:slug",
          component: Post,
          loader: async ({ params, signal }) => {
            const res = await fetch(`/api/posts/${params.slug}`, { signal });
            return res.json();
          },
        },
      ],
    },
  ],
});

function Layout() {
  const { status, error } = useNavigation();
  return (
    <div>
      <nav>
        <Link href="/">Home</Link>
        <Link href="/posts/one">Post</Link>
      </nav>
      {status === "error" ? <p role="alert">{String(error)}</p> : null}
      <Outlet />
    </div>
  );
}

function Home() {
  return <h1>Home</h1>;
}

function Post() {
  const { slug } = useParams();
  const data = useLoaderData<{ title: string }>();
  return <h1>{data?.title ?? slug}</h1>;
}

render(<Router router={router} fallback={<p>Loading…</p>} />, document.getElementById("app")!);
```

## Behavior contract (SPA v1)

| Topic                   | Behavior                                                                                           |
| ----------------------- | -------------------------------------------------------------------------------------------------- |
| **Matching**            | Nested routes; `:param` and `*splat`; static beats param; trailing slashes normalized              |
| **Index routes**        | Parent with children needs an `index: true` child to match the parent path exactly                 |
| **Loaders**             | Root → leaf after match; location commits after success **or** loader error (URL stays aligned)    |
| **`beforeLoad`**        | Runs on **every** navigation for matched segments (auth guards). Not cache-skipped                 |
| **Loader reuse**        | Cached when route id + params + **search** unchanged. Hash does not affect reuse                   |
| **Redirects**           | `throw redirect("/x")` or `return redirect("/x")`; loop guard (~10)                                |
| **`base`**              | History + `<Link href>` include base; `location.pathname` / `navigate` app paths are base-stripped |
| **Relative `navigate`** | Directory join against current pathname (e.g. from `/blog`, `"post"` → `/blog/post`)               |
| **Same URL**            | Identical path+search+hash+state does not push another history entry                               |
| **Errors**              | `status === "error"` + `error` signal; branch in app UI via `useNavigation()`                      |
| **Dispose**             | `start()` cleanup aborts in-flight loads and clears `loading` → `idle`                             |

## API

```ts
createRouter({ routes, history?, initialPath?, base?, initialEntries? })
redirect(to, { replace? })
<Router router fallback? />
<Link href exact? replace? />
<Outlet />
useRouter / useLocation / useParams / useLoaderData / useNavigation
```

## Non-goals (v1)

- File-based routes
- SSR / hydration reconciliation
- React compatibility layer
- Full typed path builders
- Coupling to `@fixerframework/state` or `@fixerframework/auth`
