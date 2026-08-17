"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEventHandler } from "react";

type LinkItem = { href: string; label: string; newTab?: boolean };

export function HeaderMenuLink({
  link,
  inline = false,
  onClick
}: {
  link: LinkItem;
  inline?: boolean;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}) {
  const pathname = usePathname();
  const icon = getHeaderIcon(link.href, link.label);
  const isExternal = link.href.startsWith("http://") || link.href.startsWith("https://");
  const shouldOpenInNewTab = Boolean(link.newTab ?? isExternal);
  const isActive = !isExternal && isPathActive(pathname ?? "/", link.href);

  const inlineBaseClass =
    "group inline-flex min-h-10 min-w-[124px] items-center justify-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 transform-gpu will-change-transform transition-[background-color,border-color,color,box-shadow,transform] duration-250 visited:text-white";

  const className = inline
    ? `${inlineBaseClass} ${
      isActive
        ? "text-white bg-white/28 border-white/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_6px_18px_rgba(15,23,42,0.2)] scale-[1.02]"
        : "text-white/95 visited:text-white/95 bg-white/8 border-white/10 hover:bg-white/34 hover:border-white/55 hover:text-white hover:visited:text-white hover:scale-[1.03] hover:-translate-y-0.5 hover:shadow-[0_10px_26px_rgba(2,6,23,0.30)]"
    }`
    : `flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${
      isActive
        ? "bg-brand-50 font-semibold text-brand-700 dark:bg-brand-900/30 dark:text-brand-200"
        : "text-slate-700 hover:bg-slate-100 hover:text-brand-600 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-brand-200"
    }`;

  return isExternal ? (
    <a
      href={link.href}
      target={shouldOpenInNewTab ? "_blank" : undefined}
      rel={shouldOpenInNewTab ? "noreferrer" : undefined}
      className={className}
      aria-current={isActive ? "page" : undefined}
      onClick={onClick}
    >
      {icon}
      {link.label}
    </a>
  ) : (
    <Link
      href={link.href}
      target={shouldOpenInNewTab ? "_blank" : undefined}
      rel={shouldOpenInNewTab ? "noreferrer" : undefined}
      className={className}
      aria-current={isActive ? "page" : undefined}
      onClick={onClick}
    >
      {icon}
      {link.label}
    </Link>
  );
}

function isPathActive(pathname: string, href: string) {
  const current = normalizePath(pathname);
  const target = normalizePath(href);

  if (target === "/") {
    return current === "/";
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

function getHeaderIcon(href: string, label: string) {
  const key = stripAccents(`${label} ${href}`).toLowerCase();
  const iconClass = "h-4 w-4 shrink-0";

  if (key.includes("noticia")) {
    return (
      <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 4h16v16H4zM7 7h10v2H7zm0 4h10v2H7zm0 4h6v2H7z" />
      </svg>
    );
  }

  if (key.includes("event")) {
    return (
      <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 2h2v3H7zM15 2h2v3h-2zM4 6h16v14H4zM6 10h12v2H6z" />
      </svg>
    );
  }

  if (key.includes("document") || key.includes("diario")) {
    return (
      <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 2h8l4 4v16H6zM8 8h8v2H8zm0 4h8v2H8zm0 4h6v2H8z" />
      </svg>
    );
  }

  if (key.includes("galeria") || key.includes("foto") || key.includes("video")) {
    return (
      <svg className={iconClass} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="m8 14 2.2-2.2a1 1 0 0 1 1.4 0L14 14l1.2-1.2a1 1 0 0 1 1.4 0L20 16" />
        <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (key.includes("escola") || key.includes("institucional") || key.includes("/p/")) {
    return (
      <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3 2 8l10 5 8-4v6h2V8L12 3z" />
        <path d="M6 12v4.5C7.6 18.1 9.6 19 12 19s4.4-.9 6-2.5V12l-6 3-6-3z" />
      </svg>
    );
  }

  if (key.includes("secretaria")) {
    return (
      <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 3h10a2 2 0 0 1 2 2v16l-3-2-3 2-3-2-3 2-3-2V5a2 2 0 0 1 2-2zm2 5h6V6H9v2zm0 4h6v-2H9v2zm0 4h4v-2H9v2z" />
      </svg>
    );
  }

  return getIcon(href, label);
}

function stripAccents(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function getIcon(href: string, label: string) {
  const key = `${label} ${href}`.toLowerCase();
  if (key.includes("início") || href === "/") {
    return (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 3l9 8h-3v10h-5v-6h-2v6H6V11H3l9-8z" />
      </svg>
    );
  }
  if (key.includes("notícia")) {
    return (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M4 4h16v16H4zM7 7h10v2H7zm0 4h10v2H7zm0 4h6v2H7z" />
      </svg>
    );
  }
  if (key.includes("event")) {
    return (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M7 2h2v3H7zM15 2h2v3h-2zM4 6h16v14H4zM6 10h12v2H6z" />
      </svg>
    );
  }
  if (key.includes("document") || key.includes("diário") || key.includes("diario")) {
    return (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M6 2h8l4 4v16H6zM8 8h8v2H8zm0 4h8v2H8zm0 4h6v2H8z" />
      </svg>
    );
  }
  if (key.includes("contato")) {
    return (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M2 5h20v14H2zM4 7l8 5 8-5" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}
