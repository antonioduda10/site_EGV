import { db } from "@/lib/db";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { EventosForm } from "@/components/forms/eventos-form";
import { requirePermission } from "@/lib/require-permission";
import { Permissions } from "@/lib/permissions";
import { EventoActions } from "@/components/dashboard/evento-actions";
import { compactEventoOrdens } from "@/lib/event-order";
import type { ReactNode } from "react";

export default async function EventosDashboard() {
  const { allowed } = await requirePermission(Permissions.EVENTS_WRITE);
  if (!allowed) {
    return (
      <div>
        <DashboardTopbar title="Eventos" />
        <div className="p-6 text-sm text-slate-600">Sem permissão para acessar.</div>
      </div>
    );
  }
  await compactEventoOrdens();
  // Lista eventos para manutencao no painel.
  const eventos = await db.evento.findMany({
    orderBy: [{ ordem: "asc" }, { dataInicio: "desc" }]
  });
  const agora = new Date();
  const publicados = eventos.filter((evento) => evento.status === "PUBLICADO").length;
  const rascunhos = eventos.filter((evento) => evento.status === "RASCUNHO").length;
  const proximos = eventos.filter((evento) => evento.dataInicio >= agora).length;
  const proximoEvento = eventos
    .filter((evento) => evento.dataInicio >= agora)
    .sort((a, b) => a.dataInicio.getTime() - b.dataInicio.getTime())[0];

  return (
    <div>
      <DashboardTopbar title="Eventos" />
      <div className="grid gap-6 p-6">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-0 lg:grid-cols-[1fr_340px]">
            <div className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700 dark:text-brand-300">
                Agenda escolar
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                Gerencie os eventos do portal
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Cadastre, organize e publique eventos mantendo a agenda pública sempre clara para famílias, estudantes e equipe escolar.
              </p>
            </div>
            <div className="flex items-center border-t border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950/50 lg:border-l lg:border-t-0">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Próximo evento</p>
                {proximoEvento ? (
                  <>
                    <p className="mt-1 truncate text-xl font-semibold text-slate-900 dark:text-slate-100">{proximoEvento.titulo}</p>
                    <p className="mt-1 text-sm text-brand-700 dark:text-brand-300">{formatDateTime(proximoEvento.dataInicio)}</p>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Nenhum evento futuro cadastrado.</p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ResumoCard title="Eventos" value={eventos.length} hint="Total cadastrado" tone="brand" />
          <ResumoCard title="Publicados" value={publicados} hint="Visíveis no site público" tone="emerald" />
          <ResumoCard title="Rascunhos" value={rascunhos} hint="Aguardando publicação" tone="amber" />
          <ResumoCard title="Próximos" value={proximos} hint="Com data futura" tone="sky" />
        </section>

        <EventosForm />

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 p-5 dark:border-slate-800">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Eventos cadastrados</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  A ordem define a posição de exibição e continua sendo reorganizada automaticamente quando necessário.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {eventos.length} registro(s)
              </span>
            </div>
          </div>
          {eventos.length === 0 ? (
            <div className="p-6 text-sm text-slate-600 dark:text-slate-300">Nenhum evento cadastrado ainda.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
                    <th className="p-4">Evento</th>
                    <th className="p-4">Local</th>
                    <th className="p-4">Ordem</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {eventos.map((evento) => (
                    <tr key={evento.id} className="border-b border-slate-100 align-top last:border-b-0 dark:border-slate-800/70">
                      <td className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100 dark:bg-brand-900/30 dark:text-brand-300 dark:ring-brand-900/60">
                            <span className="text-lg font-bold leading-none">{evento.dataInicio.toLocaleDateString("pt-BR", { day: "2-digit" })}</span>
                            <span className="mt-0.5 text-[10px] font-semibold uppercase">
                              {evento.dataInicio.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 dark:text-slate-100">{evento.titulo}</p>
                            <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{evento.descricao}</p>
                            <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">{formatPeriod(evento.dataInicio, evento.dataFim)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-300">{evento.local}</td>
                      <td className="p-4">
                        <Badge tone="slate">#{evento.ordem}</Badge>
                      </td>
                      <td className="p-4">
                        <Badge tone={evento.status === "PUBLICADO" ? "emerald" : "amber"}>
                          {evento.status === "PUBLICADO" ? "Publicado" : "Rascunho"}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
                        <EventoActions
                          evento={{
                            id: evento.id,
                            titulo: evento.titulo,
                            descricao: evento.descricao,
                            conteudo: evento.conteudo,
                            dataInicio: evento.dataInicio.toISOString(),
                            dataFim: evento.dataFim ? evento.dataFim.toISOString() : null,
                            local: evento.local,
                            ordem: evento.ordem,
                            status: evento.status
                          }}
                        />
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

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatPeriod(start: Date, end: Date | null) {
  if (!end) return formatDateTime(start);
  return `${formatDateTime(start)} até ${formatDateTime(end)}`;
}
