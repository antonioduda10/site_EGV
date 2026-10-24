"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { HeaderMobileMenu } from "@/components/header-mobile-menu";
import { ThemeToggle } from "@/components/theme-toggle";

type LinkItem = { href: string; label: string; newTab?: boolean };

export function HeaderSessionControls({ links }: { links: LinkItem[] }) {
  const { data: session, status } = useSession();
  const hasActiveSession = Boolean(session?.user?.id) && !session?.invalidated;

  return (
    <div className="flex items-center gap-3">
      <ThemeToggle compact />
      {hasActiveSession ? (
        <Link
          href="/dashboard"
          className="hidden rounded bg-brand-600 px-4 py-2 font-medium text-white transition-colors hover:bg-brand-700 md:inline-flex"
        >
          Painel
        </Link>
      ) : status !== "loading" ? (
        <Link
          href="/login"
          className="hidden text-sm text-slate-600 transition-colors hover:text-brand-600 md:inline-flex dark:text-slate-300"
        >
          Login
        </Link>
      ) : null}

      <HeaderMobileMenu links={links} hasActiveSession={hasActiveSession} />
    </div>
  );
}
