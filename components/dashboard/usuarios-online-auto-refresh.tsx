"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const REFRESH_INTERVAL_MS = 10000;

export function UsuariosOnlineAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => {
      // Atualiza dados server-side da página de usuários para refletir status online sem F5 manual.
      router.refresh();
    };

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    }, REFRESH_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [router]);

  return null;
}
