import { db } from "@/lib/db";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { PaginasForm } from "@/components/forms/paginas-form";
import { requirePermission } from "@/lib/require-permission";
import { Permissions } from "@/lib/permissions";
import { PaginaActions } from "@/components/dashboard/pagina-actions";
import type { ReactNode } from "react";

export default async function PaginasDashboard() {
  const { allowed } = await requirePermission(Permissions.PAGES_WRITE);
  if (!allowed) {
    return (
      <div>
        <DashboardTopbar title="Páginas institucionais" />
        <div className="p-6 text-sm text-slate-600">Sem permissão para acessar.</div>
      </div>
    );
  }
  // Lista paginas institucionais ordenadas por prioridade.
  const paginas = await db.paginaInstitucional.findMany({ orderBy: { ordem: "asc" } });
  const visiveis = paginas.filter((pagina) => pagina.visivel).length;
  const ocultas = paginas.length - visiveis;
  const primeiraPagina = paginas[0];

  return (
    <div>
      <DashboardTopbar title="Páginas institucionais" />
      <div className="grid gap-6 p-6">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-0 lg:grid-cols-[1fr_340px]">
            <div className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700 dark:text-brand-300">
                Conteúdo institucional
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                Gerencie as páginas do portal
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Organize textos institucionais, endereços públicos, ordem de exibição e visibilidade das páginas da escola.
              </p>
            </div>
            <div className="flex items-center border-t border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950/50 lg:border-l lg:border-t-0">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Primeira na ordem</p>
                {primeiraPagina ? (
                  <>
                    <p className="mt-1 truncate text-xl font-semibold text-slate-900 dark:text-slate-100">{primeiraPagina.titulo}</p>
                    <p className="mt-1 text-sm text-brand-700 dark:text-brand-300">/p/{primeiraPagina.slug}</p>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Nenhuma página cadastrada ainda.</p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ResumoCard title="Páginas" value={paginas.length} hint="Total cadastrado" tone="brand" />
          <ResumoCard title="Visíveis" value={visiveis} hint="Aparecem no portal público" tone="emerald" />
          <ResumoCard title="Ocultas" value={ocultas} hint="Fora da navegação pública" tone="amber" />
          <ResumoCard title="Na ordem" value={paginas.length} hint="Organizadas por prioridade" tone="sky" />
        </section>

        <PaginasForm />

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 p-5 dark:border-slate-800">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Páginas cadastradas</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Acompanhe endereço, visibilidade e posição de cada página institucional.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {paginas.length} registro(s)
              </span>
            </div>
          </div>
          {paginas.length === 0 ? (
            <div className="p-6 text-sm text-slate-600 dark:text-slate-300">Nenhuma página institucional cadastrada ainda.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
                    <th className="p-4">Página</th>
                    <th className="p-4">Endereço</th>
                    <th className="p-4">Ordem</th>
                    <th className="p-4">Visibilidade</th>
                    <th className="p-4">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {paginas.map((pagina) => (
                    <tr key={pagina.id} className="border-b border-slate-100 align-top last:border-b-0 dark:border-slate-800/70">
                      <td className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-sm font-bold text-brand-700 ring-1 ring-brand-100 dark:bg-brand-900/30 dark:text-brand-300 dark:ring-brand-900/60">
                            {getInitials(pagina.titulo)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 dark:text-slate-100">{pagina.titulo}</p>
                            <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                              {stripHtml(pagina.conteudo) || "Sem prévia de conteúdo."}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm">
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          /p/{pagina.slug}
                        </span>
                      </td>
                      <td className="p-4">
                        <Badge tone="slate">#{pagina.ordem}</Badge>
                      </td>
                      <td className="p-4">
                        <Badge tone={pagina.visivel ? "emerald" : "amber"}>{pagina.visivel ? "Visível" : "Oculta"}</Badge>
                      </td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
                        <PaginaActions pagina={pagina} />
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

function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

function getInitials(title: string) {
  return title
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "P";
}
