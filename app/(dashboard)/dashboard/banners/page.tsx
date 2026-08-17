import { db } from "@/lib/db";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { requirePermission } from "@/lib/require-permission";
import { Permissions } from "@/lib/permissions";
import { BannersForm } from "@/components/forms/banners-form";
import { BannerCarouselSettingsForm } from "@/components/forms/banner-carousel-settings-form";
import { BannerActions } from "@/components/dashboard/banner-actions";
import { toPublicUrl } from "@/lib/uploads-url";
import { getHomeAlertsJson } from "@/lib/home-alerts-config";
import { parseHomeDisplaySettings } from "@/lib/home-alerts";
import type { ReactNode } from "react";

export default async function BannersPage() {
  const { allowed } = await requirePermission(Permissions.BANNERS_WRITE);
  if (!allowed) {
    return (
      <div>
        <DashboardTopbar title="Banners" />
        <div className="p-6 text-sm text-slate-600">Sem permissão para acessar.</div>
      </div>
    );
  }

  // Ordena banners pela prioridade definida no painel.
  const [banners, avisosHomeJson] = await Promise.all([
    db.banner.findMany({
      orderBy: { ordem: "asc" }
    }),
    getHomeAlertsJson()
  ]);
  const homeDisplaySettings = parseHomeDisplaySettings(avisosHomeJson);
  const ativos = banners.filter((banner) => banner.ativo).length;
  const inativos = banners.length - ativos;
  const comLink = banners.filter((banner) => Boolean(banner.link)).length;
  const primeiroBanner = banners[0];

  return (
    <div>
      <DashboardTopbar title="Banners da Página Inicial" />
      <div className="grid gap-6 p-6">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-0 lg:grid-cols-[1fr_340px]">
            <div className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700 dark:text-brand-300">
                Destaques da home
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                Gerencie os banners da página inicial
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Organize imagens, chamadas, links e ordem de exibição do carrossel principal do portal.
              </p>
            </div>
            <div className="flex items-center border-t border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950/50 lg:border-l lg:border-t-0">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Primeiro destaque</p>
                {primeiroBanner ? (
                  <>
                    <p className="mt-1 truncate text-xl font-semibold text-slate-900 dark:text-slate-100">{primeiroBanner.titulo}</p>
                    <p className="mt-1 text-sm text-brand-700 dark:text-brand-300">Ordem #{primeiroBanner.ordem}</p>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Nenhum banner cadastrado ainda.</p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ResumoCard title="Banners" value={banners.length} hint="Total cadastrado" tone="brand" />
          <ResumoCard title="Ativos" value={ativos} hint="Aparecem no carrossel" tone="emerald" />
          <ResumoCard title="Inativos" value={inativos} hint="Fora da página inicial" tone="amber" />
          <ResumoCard title="Com link" value={comLink} hint="Direcionam ao clique" tone="sky" />
        </section>

        <BannerCarouselSettingsForm initialIntervalMs={homeDisplaySettings.bannerIntervalMs} />

        <BannersForm />

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 p-5 dark:border-slate-800">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Banners cadastrados</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  A ordem define a sequência no carrossel da página inicial.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {banners.length} registro(s)
              </span>
            </div>
          </div>
          {banners.length === 0 ? (
            <div className="p-6 text-sm text-slate-600 dark:text-slate-300">Nenhum banner cadastrado ainda.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
                    <th className="p-4">Banner</th>
                    <th className="p-4">Link</th>
                    <th className="p-4">Ordem</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Cadastro</th>
                    <th className="p-4">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {banners.map((banner) => (
                    <tr key={banner.id} className="border-b border-slate-100 align-top last:border-b-0 dark:border-slate-800/70">
                      <td className="p-4">
                        <div className="flex items-start gap-4">
                          <img
                            src={toPublicUrl(banner.imagem)}
                            alt={banner.titulo}
                            loading="lazy"
                            decoding="async"
                            className="h-20 w-36 shrink-0 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-800"
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 dark:text-slate-100">{banner.titulo}</p>
                            <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                              {banner.descricao || "Sem descrição cadastrada."}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
                        {banner.link ? (
                          <span className="block max-w-[220px] truncate rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            {banner.link}
                          </span>
                        ) : (
                          <span className="text-slate-400">Sem link</span>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge tone="slate">#{banner.ordem}</Badge>
                      </td>
                      <td className="p-4">
                        <Badge tone={banner.ativo ? "emerald" : "amber"}>{banner.ativo ? "Ativo" : "Inativo"}</Badge>
                      </td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-300">{formatDate(banner.dataCadastro)}</td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
                        <BannerActions banner={banner} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ResumoCard({
  title,
  value,
  hint,
  tone
}: {
  title: string;
  value: number;
  hint: string;
  tone: "brand" | "emerald" | "amber" | "sky";
}) {
  const toneClasses = {
    brand: "bg-brand-50 text-brand-700 ring-brand-100 dark:bg-brand-900/30 dark:text-brand-300 dark:ring-brand-900/60",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60",
    amber: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60",
    sky: "bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900/60"
  }[tone];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${toneClasses}`}>{title}</div>
      <p className="mt-4 text-3xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{hint}</p>
    </div>
  );
}

function Badge({ children, tone }: { children: ReactNode; tone: "emerald" | "amber" | "slate" }) {
  const toneClasses = {
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60",
    amber: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60",
    slate: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700"
  }[tone];

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${toneClasses}`}>
      {children}
    </span>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}
