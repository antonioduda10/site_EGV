import { db } from "@/lib/db";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { requirePermission } from "@/lib/require-permission";
import { Permissions } from "@/lib/permissions";
import { ContatoActions } from "@/components/dashboard/contato-actions";
import { ContatosAutoRefresh } from "@/components/dashboard/contatos-auto-refresh";
import type { ReactNode } from "react";

export default async function ContatosDashboard() {
  // Lista sugestoes/contatos recebidos no portal.
  const { allowed, session } = await requirePermission(Permissions.CONTACTS_READ);
  const { allowed: canManageContacts } = await requirePermission(Permissions.CONTACTS_WRITE);
  if (!allowed || !session) {
    return (
      <div>
        <DashboardTopbar title="Contatos" />
        <div className="p-6 text-sm text-slate-600">Sem permissão para acessar.</div>
      </div>
    );
  }

  const contatos = await db.sugestaoContato.findMany({ orderBy: { dataEnvio: "desc" } });
  const visibleContatos = contatos.filter((contato) => canViewContato(session.user.roles ?? [], session.user.superAdmin, contato.perfilDestino));
  const novos = visibleContatos.filter((contato) => contato.statusAtendimento === "NOVO").length;
  const emAndamento = visibleContatos.filter((contato) => contato.statusAtendimento === "EM_ANDAMENTO").length;
  const resolvidos = visibleContatos.filter((contato) => contato.statusAtendimento === "RESOLVIDO").length;
  const destinos = new Set(visibleContatos.map((contato) => contato.perfilDestino ?? "Direção")).size;
  const ultimoContato = visibleContatos[0];

  return (
    <div>
      <DashboardTopbar title="Contatos" />
      <ContatosAutoRefresh />
      <div className="grid gap-6 p-6">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-0 lg:grid-cols-[1fr_340px]">
            <div className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700 dark:text-brand-300">
                Caixa de entrada
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                Mensagens recebidas pelo portal
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Acompanhe solicitações, sugestões e mensagens enviadas pela comunidade escolar, com destino e status de atendimento.
              </p>
            </div>
            <div className="flex items-center border-t border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950/50 lg:border-l lg:border-t-0">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Mensagem mais recente</p>
                {ultimoContato ? (
                  <>
                    <p className="mt-1 truncate text-xl font-semibold text-slate-900 dark:text-slate-100">{ultimoContato.assunto}</p>
                    <p className="mt-1 text-sm text-brand-700 dark:text-brand-300">{formatDateTime(ultimoContato.dataEnvio)}</p>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Nenhuma mensagem recebida ainda.</p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ResumoCard title="Mensagens" value={visibleContatos.length} hint="Visíveis para seu perfil" tone="brand" />
          <ResumoCard title="Novas" value={novos} hint="Aguardando triagem" tone="amber" />
          <ResumoCard title="Em andamento" value={emAndamento} hint="Em atendimento" tone="sky" />
          <ResumoCard title="Resolvidas" value={resolvidos} hint={`${destinos} destino(s) envolvidos`} tone="emerald" />
        </section>

        {!canManageContacts && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
            Você possui acesso de leitura. Para alterar status ou excluir mensagens, habilite a permissão de gerenciamento de contatos.
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 p-5 dark:border-slate-800">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Contatos recebidos</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Lista filtrada conforme seu perfil de acesso no painel.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {visibleContatos.length} registro(s)
              </span>
            </div>
          </div>

          {visibleContatos.length === 0 ? (
            <div className="p-6 text-sm text-slate-600 dark:text-slate-300">Nenhuma mensagem de contato disponível para seu perfil.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
                    <th className="p-4">Remetente</th>
                    <th className="p-4">Mensagem</th>
                    <th className="p-4">Destino</th>
                    <th className="p-4">Envio</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleContatos.map((contato) => (
                    <tr key={contato.id} className="border-b border-slate-100 align-top last:border-b-0 dark:border-slate-800/70">
                      <td className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-sm font-bold text-brand-700 ring-1 ring-brand-100 dark:bg-brand-900/30 dark:text-brand-300 dark:ring-brand-900/60">
                            {getInitials(contato.nome)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 dark:text-slate-100">{contato.nome}</p>
                            <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{contato.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-[34rem] p-4">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{contato.assunto}</p>
                        <p className="mt-1 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300" title={contato.mensagem}>
                          {contato.mensagem}
                        </p>
                      </td>
                      <td className="p-4">
                        <Badge tone="slate">{contato.perfilDestino ?? "Direção"}</Badge>
                      </td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-300">{formatDateTime(contato.dataEnvio)}</td>
                      <td className="p-4">
                        <Badge tone={statusTone(contato.statusAtendimento)}>{formatStatus(contato.statusAtendimento)}</Badge>
                      </td>
                      <td className="p-4 text-sm">
                        <ContatoActions contato={contato} bloqueado={!canManageContacts} />
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

function formatStatus(value: string) {
  if (value === "NOVO") return "Novo";
  if (value === "EM_ANDAMENTO") return "Em andamento";
  if (value === "RESOLVIDO") return "Resolvido";
  return value;
}

function statusTone(value: string): "emerald" | "amber" | "sky" | "slate" {
  if (value === "EM_ANDAMENTO") return "sky";
  if (value === "RESOLVIDO") return "emerald";
  if (value === "NOVO") return "amber";
  return "slate";
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

function Badge({ children, tone }: { children: ReactNode; tone: "emerald" | "amber" | "sky" | "slate" }) {
  const toneClasses = {
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60",
    amber: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60",
    sky: "bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900/60",
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

function getInitials(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "C";
}

function canViewContato(userRoles: string[], superAdmin: boolean, perfilDestino: string | null) {
  if (superAdmin) return true;
  if (userRoles.includes("Admin")) return true;
  if (!perfilDestino) return true;

  const hierarchy = ["Admin", "Direção", "Coordenação", "Secretaria", "Comunicação", "Docente", "Aluno", "Responsável"];
  const destinationRank = hierarchy.indexOf(perfilDestino);
  if (destinationRank === -1) {
    return userRoles.includes(perfilDestino);
  }

  const userRank = userRoles.reduce((minRank, role) => {
    const rank = hierarchy.indexOf(role);
    if (rank === -1) return minRank;
    return Math.min(minRank, rank);
  }, Number.POSITIVE_INFINITY);

  return userRank <= destinationRank;
}
