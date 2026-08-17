import { db } from "@/lib/db";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import Link from "next/link";
import type { ReactNode } from "react";
import { requirePermission } from "@/lib/require-permission";
import { Permissions } from "@/lib/permissions";

export default async function DashboardHome() {
  const { allowed } = await requirePermission(Permissions.DASHBOARD_READ);
  if (!allowed) {
    return (
      <div>
        <DashboardTopbar title="Visão geral" />
        <div className="p-6 text-sm text-slate-600">Sem permissão para acessar.</div>
      </div>
    );
  }

  // Agrega indicadores principais para o painel.
  const [noticias, eventos, documentos, pendentes] = await Promise.all([
    db.noticia.count(),
    db.evento.count(),
    db.arquivoDocumento.count(),
    db.noticia.count({ where: { status: "ENVIADO_PARA_APROVACAO" } })
  ]);

  return (
    <div>
      <DashboardTopbar title="Visão geral" />
      <div className="space-y-6 p-6">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-0 lg:grid-cols-[1fr_280px]">
            <div className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700 dark:text-brand-300">
                Painel administrativo
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                Acompanhe o portal em poucos segundos
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Um resumo rápido dos conteúdos cadastrados e das pendências de publicação da escola.
              </p>
            </div>
            <div className="flex items-center border-t border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950/50 lg:border-l lg:border-t-0">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Pendências para revisar</p>
                <p className="mt-1 text-4xl font-bold text-amber-700 dark:text-amber-300">{pendentes}</p>
                <Link
                  href="/dashboard/noticias"
                  className="mt-3 inline-flex rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950"
                >
                  Ver notícias
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatLink href="/dashboard/noticias" title="Notícias" value={noticias} hint="Conteúdos cadastrados" tone="brand" />
          <StatLink href="/dashboard/eventos" title="Eventos" value={eventos} hint="Agenda institucional" tone="emerald" />
          <StatLink href="/dashboard/documentos" title="Documentos" value={documentos} hint="Arquivos publicados" tone="sky" />
          <StatLink href="/dashboard/noticias" title="Pendências" value={pendentes} hint="Aguardando aprovação" tone="amber" />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Atalhos rápidos</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <QuickLink href="/dashboard/noticias">Notícias</QuickLink>
              <QuickLink href="/dashboard/eventos">Eventos</QuickLink>
              <QuickLink href="/dashboard/documentos">Documentos</QuickLink>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Status da revisão</h3>
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                {pendentes === 0 ? "Nenhuma notícia aguardando aprovação." : `${pendentes} notícia(s) aguardando aprovação.`}
              </p>
              <p className="mt-1 text-sm text-amber-800/80 dark:text-amber-200/80">
                Use este espaço para acompanhar rapidamente o que precisa de atenção.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatLink({
  href,
  title,
  value,
  hint,
  tone
}: {
  href: string;
  title: string;
  value: number;
  hint: string;
  tone: "brand" | "emerald" | "sky" | "amber";
}) {
  const toneClasses = {
    brand: "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-900/50 dark:bg-brand-900/30 dark:text-brand-300",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300",
    sky: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-300",
    amber: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300"
  }[tone];

  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:border-slate-800 dark:bg-slate-900 dark:focus:ring-offset-slate-950"
    >
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-bold ${toneClasses}`}>
        {title.slice(0, 1)}
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{title}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{hint}</p>
    </Link>
  );
}

function QuickLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-brand-800 dark:hover:bg-brand-900/40 dark:hover:text-brand-300 dark:focus:ring-offset-slate-950"
    >
      {children}
    </Link>
  );
}
