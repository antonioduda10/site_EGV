import { DashboardTopbar } from "@/components/dashboard/topbar";
import { AvisosManager } from "@/components/dashboard/avisos-manager";
import { requirePermission } from "@/lib/require-permission";
import { Permissions } from "@/lib/permissions";
import { getManagedHomeAlertsConfig } from "@/lib/home-alerts-config";

export const dynamic = "force-dynamic";

export default async function AvisosDashboard() {
  const { allowed } = await requirePermission(Permissions.ALERTS_WRITE);
  if (!allowed)
    return (
      <div>
        <DashboardTopbar title="Avisos" />
        <div className="p-6 text-sm text-slate-600 dark:text-slate-300">
          Sem permissão para acessar.
        </div>
      </div>
    );
  const config = await getManagedHomeAlertsConfig();
  return (
    <div>
      <DashboardTopbar title="Avisos" />
      <div className="min-w-0 p-4 sm:p-6">
        <AvisosManager initialConfig={config} />
      </div>
    </div>
  );
}
