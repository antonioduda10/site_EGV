"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const CHECK_INTERVAL_MS = 15000;
const PERMISSIONS_STATE_KEY = "egv:permissions-state";

type PingPayload = {
  invalidated?: boolean;
  authenticated?: boolean;
};

export function SessionWatchdog() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;

    const checkSession = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const response = await fetch("/api/auth/ping", {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin"
        });

        if (!response.ok || cancelled) return;

        const session = (await response.json()) as PingPayload;
        if (cancelled) return;

        if (session?.invalidated || session?.authenticated === false) {
          window.location.replace("/login?reason=session-invalidated");
          return;
        }

        const stateResponse = await fetch("/api/auth/permissions-state", {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin"
        });

        if (!stateResponse.ok || cancelled) {
          return;
        }

        const stateData = (await stateResponse.json()) as { stateKey?: string };
        const currentKey = stateData.stateKey ?? "";
        const previousKey = sessionStorage.getItem(PERMISSIONS_STATE_KEY);

        if (!previousKey) {
          sessionStorage.setItem(PERMISSIONS_STATE_KEY, currentKey);
          return;
        }

        if (previousKey !== currentKey) {
          sessionStorage.setItem(PERMISSIONS_STATE_KEY, currentKey);
          router.refresh();
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
  }, [router]);

  return null;
}
