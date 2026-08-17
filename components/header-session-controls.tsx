"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HeaderMobileMenu } from "@/components/header-mobile-menu";
import { ThemeToggle } from "@/components/theme-toggle";

type LinkItem = { href: string; label: string; newTab?: boolean };

type SessionPayload = {
  invalidated?: boolean;
  user?: {
    id?: string;
  };
} | null;

export function HeaderSessionControls({ links }: { links: LinkItem[] }) {
  const [hasActiveSession, setHasActiveSession] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      try {
        const response = await fetch("/api/auth/session", {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin"
        });
        if (!response.ok || cancelled) return;

        const session = (await response.json()) as SessionPayload;
        if (!cancelled) {
          setHasActiveSession(Boolean(session?.user?.id) && !session?.invalidated);
        }
      } catch {
        if (!cancelled) setHasActiveSession(false);
      }
    };

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

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
      ) : (
        <Link
          href="/login"
          className="hidden text-sm text-slate-600 transition-colors hover:text-brand-600 md:inline-flex dark:text-slate-300"
        >
          Login
        </Link>
      )}

      <HeaderMobileMenu links={links} hasActiveSession={hasActiveSession} />
    </div>
  );
}
