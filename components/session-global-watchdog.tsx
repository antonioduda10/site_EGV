"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const CHECK_INTERVAL_MS = 15000;

type SessionPayload = {
  invalidated?: boolean;
  user?: {
    id?: string;
  };
} | null;

export function SessionGlobalWatchdog() {
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;

    const checkSession = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const response = await fetch("/api/auth/session", {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin"
        });

        if (!response.ok || cancelled) return;

        const session = (await response.json()) as SessionPayload;
        if (cancelled) return;

        if (session?.invalidated && pathname !== "/login") {
          window.location.replace("/login?reason=session-invalidated");
        }
      } catch {
        // Em falhas transitórias de rede, tentaremos novamente no próximo ciclo.
      } finally {
        inFlight = false;
      }
    };

    void checkSession();

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void checkSession();
      }
    }, CHECK_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void checkSession();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [pathname]);

  return null;
}
