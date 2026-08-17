import { ReactNode } from "react";
import { requireAuth } from "@/lib/require-auth";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { SessionWatchdog } from "@/components/dashboard/session-watchdog";
import { DashboardErrorLogger } from "@/components/dashboard/error-logger";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // Garante acesso autenticado ao painel.
  await requireAuth();
  return (
    <div className="flex min-h-screen bg-slate-100/70 lg:h-screen lg:overflow-hidden dark:bg-slate-950">
      <SessionWatchdog />
      <DashboardErrorLogger />
      <DashboardSidebar />
      <div className="min-w-0 flex-1 lg:h-screen lg:overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
