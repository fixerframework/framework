import type { JSX } from "preact";
import { applyBase, parsePath, resolvePath } from "../core/path.ts";
import { useLocation, useRouter } from "./hooks.ts";

export interface LinkProps extends Omit<JSX.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  href: string;
  /** When true, aria-current only if pathname equals href path exactly. Default: prefix match. */
  exact?: boolean;
  replace?: boolean;
}

function appPathFromHref(href: string, base: string, fromPathname: string): string {
  if (href.startsWith("http://") || href.startsWith("https://")) {
    try {
      const u = new URL(href);
      return parsePath(u.pathname).pathname;
    } catch {
      return "/";
    }
  }
  if (href.startsWith("/")) {
    return parsePath(href).pathname;
  }
  if (href.startsWith("?") || href.startsWith("#")) {
    return fromPathname;
  }
  return resolvePath(fromPathname, href).pathname;
}

/**
 * Client-side navigation link. Renders a real `<a>` for progressive enhancement / a11y.
 * `href` may be app-absolute (`/about`) or relative; the DOM `href` includes deploy `base`.
 */
export function Link({
  href,
  exact = false,
  replace = false,
  onClick,
  children,
  ...rest
}: LinkProps) {
  const router = useRouter();
  const location = useLocation();
  const targetPath = appPathFromHref(href, router.base, location.pathname);
  const current = location.pathname;
  const active = exact
    ? current === targetPath
    : current === targetPath || (targetPath !== "/" && current.startsWith(`${targetPath}/`));

  // Progressive enhancement: browser URL includes base for hard refresh / open-in-new-tab.
  let domHref = href;
  if (!href.startsWith("http://") && !href.startsWith("https://")) {
    if (href.startsWith("/")) {
      const p = parsePath(href);
      domHref = `${applyBase(p.pathname, router.base)}${p.search}${p.hash}`;
    } else if (href.startsWith("?") || href.startsWith("#")) {
      domHref = `${applyBase(location.pathname, router.base)}${href}`;
    } else {
      const resolved = resolvePath(location.pathname, href);
      domHref = `${applyBase(resolved.pathname, router.base)}${resolved.search}${resolved.hash}`;
    }
  }

  return (
    <a
      href={domHref}
      aria-current={active ? "page" : undefined}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        if (e.button !== 0) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        // Navigate with the original href so relative resolution stays consistent.
        router.navigate(href, { replace });
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
