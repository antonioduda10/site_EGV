"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function PageviewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const payload = JSON.stringify({ caminho: pathname });

    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/pageview", blob);
      return;
    }

    fetch("/api/pageview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true
    }).catch(() => null);
  }, [pathname]);

  return null;
}
