import type { JSX } from "preact";
import { useLocation, useRouter } from "./hooks.ts";

export interface LinkProps extends Omit<JSX.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  href: string;
  /** When true, aria-current only if pathname equals href path exactly. Default: prefix match. */
  exact?: boolean;
  replace?: boolean;
}

function pathOnly(href: string): string {
  const q = href.indexOf("?");
  const h = href.indexOf("#");
  let end = href.length;
  if (q >= 0) end = Math.min(end, q);
  if (h >= 0) end = Math.min(end, h);
  return href.slice(0, end) || "/";
}

/**
 * Client-side navigation link. Renders a real `<a>` for progressive enhancement / a11y.
 */
export function Link({ href, exact = false, replace = false, onClick, children, ...rest }: LinkProps) {
  const router = useRouter();
  const location = useLocation();
  const targetPath = pathOnly(href);
  const current = location.pathname;
  const active = exact
    ? current === targetPath
    : current === targetPath || (targetPath !== "/" && current.startsWith(`${targetPath}/`));

  return (
    <a
      href={href}
      aria-current={active ? "page" : undefined}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        if (e.button !== 0) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        router.navigate(href, { replace });
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
