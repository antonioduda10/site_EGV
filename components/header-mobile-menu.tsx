"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { HeaderMenuLink } from "@/components/header-menu-link";

type LinkItem = { href: string; label: string; newTab?: boolean };

export function HeaderMobileMenu({
  links,
  hasActiveSession
}: {
  links: LinkItem[];
  hasActiveSession: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const closeMenu = () => {
    setOpen(false);
    detailsRef.current?.removeAttribute("open");
  };

  const handleMenuLinkClick = (event: MouseEvent<HTMLAnchorElement>, link: LinkItem) => {
    const isExternal = link.href.startsWith("http://") || link.href.startsWith("https://");
    const shouldOpenInNewTab = Boolean(link.newTab ?? isExternal);

    closeMenu();

    if (!isExternal && !shouldOpenInNewTab) {
      event.preventDefault();
      router.push(link.href);
    }
  };

  const handleSessionLinkClick = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    closeMenu();
    event.preventDefault();
    router.push(href);
  };

  return (
    <details ref={detailsRef} className="relative md:hidden" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary
        className="list-none cursor-pointer rounded-md border border-slate-200 p-2 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        aria-label={open ? "Fechar menu" : "Abrir menu"}
      >
        <svg className="h-6 w-6 text-slate-700 dark:text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </summary>
      <div className="absolute right-0 mt-2 w-64 rounded-lg border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-2">
          {links.map((link) => (
            <div key={link.href}>
              <HeaderMenuLink link={link} onClick={(event) => handleMenuLinkClick(event, link)} />
            </div>
          ))}
          <div className="border-t border-slate-200 pt-2 dark:border-slate-700">
            {hasActiveSession ? (
              <Link
                href="/dashboard"
                className="flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-semibold text-brand-600 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-900/30"
                onClick={(event) => handleSessionLinkClick(event, "/dashboard")}
              >
                Painel
              </Link>
            ) : (
              <Link
                href="/login"
                className="flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                onClick={(event) => handleSessionLinkClick(event, "/login")}
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </details>
  );
}
