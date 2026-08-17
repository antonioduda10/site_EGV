import { DashboardTopbar } from "@/components/dashboard/topbar";
import { ConfigForm } from "@/components/forms/config-form";
import { requirePermission } from "@/lib/require-permission";
import { Permissions } from "@/lib/permissions";

export default async function ConfigPage() {
  // Tela de configuracoes gerais do portal.
  const { allowed } = await requirePermission(Permissions.CONFIG_WRITE);
  if (!allowed) {
    return (
      <div className="min-h-full bg-slate-50/80 dark:bg-slate-950">
        <DashboardTopbar title="Configurações" />
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900 shadow-sm dark:border-amber-400/30 dark:bg-amber-950/30 dark:text-amber-100">
            Sem permissão para acessar as configurações do portal.
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-full bg-slate-50/80 dark:bg-slate-950">
      <DashboardTopbar title="Configurações" />
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <section className="overflow-hidden rounded-3xl border border-brand-200/60 bg-brand-700 text-white shadow-sm dark:border-brand-400/20 dark:bg-brand-900">
          <div className="relative p-6 sm:p-8">
            <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-white/10 blur-3xl lg:block" aria-hidden="true" />
            <div className="relative max-w-3xl">
              <span className="inline-flex rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-50">
                Centro de controle
              </span>
              <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Configurações do portal</h1>
              <p className="mt-3 text-sm leading-6 text-brand-50/90 sm:text-base">
                Ajuste identidade visual, navegação, acesso rápido, rodapé e políticas do site em um só lugar. Salve
                com atenção, pois essas informações aparecem para toda a comunidade escolar.
              </p>
            </div>
            <div className="relative mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                <p className="text-xs uppercase tracking-wide text-brand-50/75">Aparência</p>
                <p className="mt-1 text-sm font-semibold">Logo e cores</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                <p className="text-xs uppercase tracking-wide text-brand-50/75">Navegação</p>
                <p className="mt-1 text-sm font-semibold">Menu e acesso rápido</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                <p className="text-xs uppercase tracking-wide text-brand-50/75">Institucional</p>
                <p className="mt-1 text-sm font-semibold">Rodapé e políticas</p>
              </div>
            </div>
          </div>
        </section>
        <ConfigForm />
      </div>
    </div>
  );
}
