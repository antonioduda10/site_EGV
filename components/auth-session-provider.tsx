"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { SessionGlobalWatchdog } from "./session-global-watchdog";

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider refetchInterval={60} refetchOnWindowFocus>
      <SessionGlobalWatchdog />
      {children}
    </SessionProvider>
  );
}
