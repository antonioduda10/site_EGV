"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type DashboardNavLinkProps = {
  href: string;
  label: string;
  external?: boolean;
  compact?: boolean;
};

export function DashboardNavLink({ href, label, external, compact = false }: DashboardNavLinkProps) {
  const pathname = usePathname();
  const isActive = !external && isPathActive(pathname ?? "/", href);

  const baseClass = compact
    ? "flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors"
    : "flex min-h-11 items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors";

  const className = `${baseClass} ${
    isActive
      ? "bg-brand-100 text-brand-800 shadow-sm dark:bg-brand-900/40 dark:text-brand-200"
      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
  }`;

  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {label}
      </a>
    );
  }

  return (
    <Link href={href} className={className} aria-current={isActive ? "page" : undefined}>
      {label}
    </Link>
  );
}

function isPathActive(pathname: string, href: string) {
  const current = normalizePath(pathname);
  const target = normalizePath(href);

  if (target === "/dashboard") {
    return current === target;
  }

  return current === target || current.startsWith(`${target}/`);
}

function normalizePath(value: string) {
  if (!value) return "/";
  const noQuery = value.split("?")[0].split("#")[0];
  if (noQuery.length > 1 && noQuery.endsWith("/")) {
    return noQuery.slice(0, -1);
  }
  return noQuery || "/";
}
