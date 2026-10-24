"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { SESSION_ACTIVITY_INTERVAL_MS, SESSION_IDLE_TIMEOUT_MS } from "@/lib/session-policy";

export function SessionGlobalWatchdog() {
  const { data: session, status, update } = useSession();
  const pathname = usePathname();
  const lastInteraction = useRef(0);
  const lastRenewedInteraction = useRef(0);
  const endingSession = useRef(false);
  const currentSession = useRef(session);
  const currentPath = useRef(pathname);

  useEffect(() => {
    currentSession.current = session;
    currentPath.current = pathname;
  }, [session, pathname]);

  const invalidated = session?.invalidated;
  const invalidatedReason = session?.invalidatedReason;

  useEffect(() => {
    if (status === "unauthenticated") endingSession.current = false;
    if (status !== "authenticated") return;
    let cancelled = false;
    let updating = false;
    const endSession = async (idle: boolean) => {
      if (endingSession.current) return;
      endingSession.current = true;
      try {
        await signOut({
          redirect: currentPath.current?.startsWith("/dashboard") ?? false,
          callbackUrl: idle ? "/login?reason=session-expired" : "/login?reason=session-invalidated"
        });
      } catch {
        endingSession.current = false;
      }
    };

    if (invalidated) {
      void endSession(invalidatedReason === "idle");
      return;
    }

    const checkActivity = async () => {
      if (cancelled || updating || endingSession.current) return;
      const activity = Math.max(lastInteraction.current, currentSession.current?.lastActivityAt ?? Date.now());
      if (Date.now() - activity >= SESSION_IDLE_TIMEOUT_MS) {
        await endSession(true);
        return;
      }
      // Polling and rendering are not user activity: renew only after an interaction.
      if (lastInteraction.current <= lastRenewedInteraction.current) return;
      updating = true;
      const interaction = lastInteraction.current;
      try {
        const renewed = await update({ activity: true });
        if (renewed?.user?.id && !renewed.invalidated) lastRenewedInteraction.current = interaction;
      } catch {
        // A temporary connection failure does not sign the user out.
      } finally { updating = false; }
    };
    const recordInteraction = () => {
      lastInteraction.current = Date.now();
      const lastActivityAt = currentSession.current?.lastActivityAt ?? Date.now();
      if (Date.now() - lastActivityAt >= SESSION_ACTIVITY_INTERVAL_MS) void checkActivity();
    };

    const events = ["pointerdown", "pointermove", "keydown", "touchstart", "wheel"] as const;
    for (const event of events) window.addEventListener(event, recordInteraction, { passive: true });
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void checkActivity();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    const interval = window.setInterval(() => { void checkActivity(); }, SESSION_ACTIVITY_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      for (const event of events) window.removeEventListener(event, recordInteraction);
    };
  }, [invalidated, invalidatedReason, status, update]);

  return null;
}
