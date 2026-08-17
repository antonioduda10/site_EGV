import { DashboardTopbar } from "@/components/dashboard/topbar";
import { db } from "@/lib/db";
import { readErrorLogEntries, type ErrorLogEntry } from "@/lib/error-log";
import { requirePermission } from "@/lib/require-permission";
import { Permissions } from "@/lib/permissions";

type CountByDay = { dia: Date; total: bigint };
type CountByLabel = { label: string; total: bigint };
type CountByPath = { caminho: string; total: bigint };

export default async function RelatoriosPage() {
  const { allowed } = await requirePermission(Permissions.REPORTS_READ);
  if (!allowed) {
    return (
      <div>
        <DashboardTopbar title="Relatórios" />
        <div className="p-6 text-sm text-slate-600 dark:text-slate-300">Sem permissão para acessar.</div>
      </div>
    );
  }

  const hoje = startOfDay(new Date());
  const inicio7Dias = addDays(hoje, -6);
  const inicio30Dias = addDays(hoje, -29);

  const [
    totalAcessos,
    acessosHoje,
    acessos7Dias,
    acessos30Dias,
    acessosPorDiaRaw,
    paginasMaisAcessadas,
    totalLogs,
    logsHoje,
    logs7Dias,
    logsPorDiaRaw,
    logsPorAcao,
    logsPorEntidade,
    logsRecentes,
    downloadsRaw
  ] = await Promise.all([
    db.pageView.count(),
    db.pageView.count({ where: { dataHora: { gte: hoje } } }),
    db.pageView.count({ where: { dataHora: { gte: inicio7Dias } } }),
    db.pageView.count({ where: { dataHora: { gte: inicio30Dias } } }),
    db.$queryRaw<CountByDay[]>`
      SELECT date_trunc('day', "dataHora") as dia, COUNT(*) as total
      FROM "PageView"
      WHERE "dataHora" >= ${inicio7Dias}
      GROUP BY dia
      ORDER BY dia ASC
    `,
    db.$queryRaw<CountByPath[]>`
      SELECT "caminho", COUNT(*) as total
      FROM "PageView"
      WHERE "dataHora" >= ${inicio30Dias}
      GROUP BY "caminho"
      ORDER BY total DESC
      LIMIT 8
    `,
    db.logAuditoria.count(),
    db.logAuditoria.count({ where: { dataHora: { gte: hoje } } }),
    db.logAuditoria.count({ where: { dataHora: { gte: inicio7Dias } } }),
    db.$queryRaw<CountByDay[]>`
      SELECT date_trunc('day', "dataHora") as dia, COUNT(*) as total
      FROM "LogAuditoria"
      WHERE "dataHora" >= ${inicio7Dias}
      GROUP BY dia
      ORDER BY dia ASC
    `,
    db.$queryRaw<CountByLabel[]>`
      SELECT "acao" as label, COUNT(*) as total
      FROM "LogAuditoria"
      GROUP BY "acao"
      ORDER BY total DESC
      LIMIT 8
    `,
    db.$queryRaw<CountByLabel[]>`
      SELECT "entidadeAfetada" as label, COUNT(*) as total
      FROM "LogAuditoria"
      GROUP BY "entidadeAfetada"
      ORDER BY total DESC
      LIMIT 8
    `,
    db.logAuditoria.findMany({
      orderBy: { dataHora: "desc" },
      take: 14
    }),
    db.$queryRaw<{ id: string | null; total: bigint }[]>`
      SELECT "idRegistroAfetado" as id, COUNT(*) as total
      FROM "LogAuditoria"
      WHERE "acao" = 'DOWNLOAD' AND "entidadeAfetada" = 'documento'
      GROUP BY "idRegistroAfetado"
      ORDER BY total DESC
      LIMIT 5
    `
  ]);
  const errorLogs = await readErrorLogEntries(80);

  const usuarioIds = logsRecentes
    .map((log) => log.usuarioResponsavelId)
    .filter((id): id is string => Boolean(id));

  const usuarios = usuarioIds.length
    ? await db.usuario.findMany({
        where: { id: { in: usuarioIds } },
        select: { id: true, nome: true, email: true }
      })
    : [];
  const usuariosPorId = new Map(usuarios.map((usuario) => [usuario.id, usuario]));

  const documentosIds = downloadsRaw.map((download) => download.id).filter((id): id is string => Boolean(id));
  const documentos = documentosIds.length
    ? await db.arquivoDocumento.findMany({
        where: { id: { in: documentosIds } },
        select: { id: true, nome: true }
      })
    : [];
  const documentosPorId = new Map(documentos.map((documento) => [documento.id, documento.nome]));
  const downloads = downloadsRaw.map((download) => ({
    label: download.id ? documentosPorId.get(download.id) ?? "Documento removido" : "Documento",
    total: download.total
  }));

  const acessosPorDia = fillDailySeries(inicio7Dias, acessosPorDiaRaw);
  const logsPorDia = fillDailySeries(inicio7Dias, logsPorDiaRaw);
  const errosHoje = countErrorLogsSince(errorLogs, hoje);
  const erros7Dias = countErrorLogsSince(errorLogs, inicio7Dias);
  const errosPorDia = fillDailySeries(inicio7Dias, countErrorLogsByDay(errorLogs, inicio7Dias));
  const errosPorStatus = countErrorLogsByLabel(errorLogs, (log) => formatErrorStatus(log.status));
  const errosPorAcao = countErrorLogsByLabel(errorLogs, (log) => log.action ?? "Ação não identificada");
  const errosRecentes = errorLogs.slice(0, 12);

  return (
    <div>
      <DashboardTopbar title="Relatórios" />
      <div className="grid min-w-0 gap-6 p-4 sm:p-6">
        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid min-w-0 gap-0 lg:grid-cols-[1fr_0.65fr]">
            <div className="min-w-0 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700 dark:text-brand-300">
                Visão administrativa
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Relatórios do portal</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Acompanhe acessos, uso das páginas públicas, downloads e movimentações registradas no painel administrativo.
              </p>
            </div>
            <div className="min-w-0 bg-brand-700 p-6 text-white">
              <div className="grid min-w-0 gap-3 sm:grid-cols-3">
                <MiniMetric label="Acessos totais" value={totalAcessos} />
                <MiniMetric label="Logs totais" value={totalLogs} />
                <MiniMetric label="Erros em 7 dias" value={erros7Dias} />
              </div>
            </div>
          </div>
        </section>

        <section className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard title="Acessos hoje" value={acessosHoje} hint="Pageviews registrados desde 00h" tone="brand" />
          <StatCard title="Acessos em 7 dias" value={acessos7Dias} hint="Movimento recente do portal" tone="emerald" />
          <StatCard title="Acessos em 30 dias" value={acessos30Dias} hint="Uso mensal aproximado" tone="amber" />
          <StatCard title="Logs em 7 dias" value={logs7Dias} hint={`${logsHoje} registro(s) hoje`} tone="slate" />
          <StatCard title="Erros em 7 dias" value={erros7Dias} hint={`${errosHoje} erro(s) hoje`} tone="rose" />
        </section>

        <section className="grid min-w-0 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Panel title="Acessos e uso" subtitle="Volume de acessos nos últimos 7 dias.">
            <DailyBars items={acessosPorDia} tone="brand" />
          </Panel>

          <Panel title="Páginas mais acessadas" subtitle="Ranking dos últimos 30 dias.">
            <RankingList
              emptyText="Nenhum acesso registrado ainda."
              items={paginasMaisAcessadas.map((item) => ({
                label: formatPath(item.caminho),
                meta: item.caminho,
                total: item.total
              }))}
              tone="brand"
            />
          </Panel>
        </section>

        <section className="grid min-w-0 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Panel title="Erros do painel" subtitle="Falhas de ações administrativas gravadas em arquivo de texto diário.">
            <DailyBars items={errosPorDia} tone="rose" />
          </Panel>

          <div className="grid min-w-0 gap-6 md:grid-cols-2">
            <Panel title="Tipos de erro" subtitle="Agrupamento por status de retorno.">
              <RankingList emptyText="Nenhum erro registrado nos arquivos de log." items={errosPorStatus} tone="rose" />
            </Panel>
            <Panel title="Ações com erro" subtitle="Operações que mais retornaram falha.">
              <RankingList
                emptyText="Nenhuma ação com erro registrada."
                items={errosPorAcao.map((item) => ({ label: humanizeAction(item.label), total: item.total }))}
                tone="rose"
              />
            </Panel>
          </div>
        </section>

        <section className="grid min-w-0 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Panel title="Relatório de logs" subtitle="Atividade administrativa registrada nos últimos 7 dias.">
            <DailyBars items={logsPorDia} tone="emerald" />
          </Panel>

          <div className="grid min-w-0 gap-6 md:grid-cols-2">
            <Panel title="Ações mais frequentes" subtitle="Agrupamento por tipo de operação.">
              <RankingList
                emptyText="Nenhum log registrado."
                items={logsPorAcao.map((item) => ({ label: humanizeAction(item.label), total: item.total }))}
                tone="emerald"
              />
            </Panel>
            <Panel title="Módulos com mais logs" subtitle="Entidades mais movimentadas.">
              <RankingList
                emptyText="Nenhuma entidade registrada."
                items={logsPorEntidade.map((item) => ({ label: humanizeEntity(item.label), total: item.total }))}
                tone="slate"
              />
            </Panel>
          </div>
        </section>

        <section className="grid min-w-0 gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <Panel title="Downloads de documentos" subtitle="Documentos mais baixados registrados na auditoria.">
            <RankingList
              emptyText="Nenhum download registrado ainda."
              items={downloads.map((item) => ({ label: item.label, total: item.total }))}
              tone="amber"
            />
          </Panel>

          <Panel title="Logs recentes" subtitle="Últimas movimentações registradas no sistema.">
            {logsRecentes.length === 0 ? (
              <EmptyState text="Nenhum log registrado ainda." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-[0.14em] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      <th className="p-3">Data</th>
                      <th className="p-3">Ação</th>
                      <th className="p-3">Módulo</th>
                      <th className="p-3">Usuário</th>
                      <th className="p-3">Registro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logsRecentes.map((log) => {
                      const usuario = log.usuarioResponsavelId ? usuariosPorId.get(log.usuarioResponsavelId) : null;
                      return (
                        <tr key={log.id} className="border-b border-slate-100 last:border-b-0 dark:border-slate-800/70">
                          <td className="p-3 text-slate-600 dark:text-slate-300">{formatDateTime(log.dataHora)}</td>
                          <td className="p-3">
                            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                              {humanizeAction(log.acao)}
                            </span>
                          </td>
                          <td className="p-3 text-slate-700 dark:text-slate-200">{humanizeEntity(log.entidadeAfetada)}</td>
                          <td className="p-3 text-slate-600 dark:text-slate-300">{usuario?.nome ?? usuario?.email ?? "Sistema"}</td>
                          <td className="max-w-[180px] truncate p-3 text-xs text-slate-500 dark:text-slate-400">
                            {log.idRegistroAfetado ?? "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </section>

        <section className="min-w-0">
          <Panel title="Erros recentes" subtitle="Últimas falhas gravadas nos arquivos de log do painel.">
            {errosRecentes.length === 0 ? (
              <EmptyState text="Nenhum erro registrado ainda. Quando uma ação do painel falhar, ela aparecerá aqui." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-[0.14em] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      <th className="p-3">Data</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Ação</th>
                      <th className="p-3">Caminho</th>
                      <th className="p-3">Usuário</th>
                      <th className="p-3">Mensagem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {errosRecentes.map((log) => (
                      <tr key={log.id} className="border-b border-slate-100 last:border-b-0 dark:border-slate-800/70">
                        <td className="p-3 text-slate-600 dark:text-slate-300">{formatDateTime(new Date(log.dataHora))}</td>
                        <td className="p-3">
                          <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                            {formatErrorStatus(log.status)}
                          </span>
                        </td>
                        <td className="p-3 text-slate-700 dark:text-slate-200">{humanizeAction(log.action ?? "ERRO")}</td>
                        <td className="max-w-[220px] truncate p-3 text-xs text-slate-500 dark:text-slate-400">
                          {log.path ?? "-"}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">{log.usuarioNome ?? "Sistema"}</td>
                        <td className="max-w-[300px] truncate p-3 text-slate-600 dark:text-slate-300">
                          {log.message ?? "Erro sem mensagem"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </section>
      </div>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function StatCard({ title, value, hint, tone }: { title: string; value: number; hint: string; tone: "brand" | "emerald" | "amber" | "slate" | "rose" }) {
  const color = {
    brand: "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
  }[tone];

  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${color}`}>{title}</div>
      <p className="mt-4 text-3xl font-bold text-slate-900 dark:text-slate-100">{formatNumber(value)}</p>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{hint}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
      <p className="text-3xl font-bold">{formatNumber(value)}</p>
      <p className="mt-1 text-sm text-white/85">{label}</p>
    </div>
  );
}

function DailyBars({ items, tone }: { items: { label: string; total: number }[]; tone: "brand" | "emerald" | "rose" }) {
  const max = Math.max(1, ...items.map((item) => item.total));
  const barColor = {
    brand: "bg-brand-600 dark:bg-brand-400",
    emerald: "bg-emerald-600 dark:bg-emerald-400",
    rose: "bg-rose-600 dark:bg-rose-400"
  }[tone];

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label} className="grid grid-cols-[70px_1fr_52px] items-center gap-3">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{item.label}</span>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.max(4, (item.total / max) * 100)}%` }} />
          </div>
          <span className="text-right text-xs font-semibold text-slate-700 dark:text-slate-200">{formatNumber(item.total)}</span>
        </div>
      ))}
    </div>
  );
}

function RankingList({
  items,
  emptyText,
  tone
}: {
  items: { label: string; total: bigint; meta?: string }[];
  emptyText: string;
  tone: "brand" | "emerald" | "amber" | "slate" | "rose";
}) {
  if (items.length === 0) return <EmptyState text={emptyText} />;

  const max = Math.max(1, ...items.map((item) => Number(item.total)));
  const barColor = {
    brand: "bg-brand-600 dark:bg-brand-400",
    emerald: "bg-emerald-600 dark:bg-emerald-400",
    amber: "bg-amber-500 dark:bg-amber-400",
    slate: "bg-slate-500 dark:bg-slate-400",
    rose: "bg-rose-600 dark:bg-rose-400"
  }[tone];

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const total = Number(item.total);
        return (
          <div key={`${item.label}-${item.meta ?? ""}`} className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{item.label}</p>
                {item.meta && <p className="truncate text-xs text-slate-500 dark:text-slate-400">{item.meta}</p>}
              </div>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{formatNumber(total)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.max(5, (total / max) * 100)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
      {text}
    </div>
  );
}

function countErrorLogsSince(entries: ErrorLogEntry[], start: Date) {
  return entries.filter((entry) => {
    const date = getErrorLogDate(entry);
    return date ? date >= start : false;
  }).length;
}

function countErrorLogsByDay(entries: ErrorLogEntry[], start: Date): CountByDay[] {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    const date = getErrorLogDate(entry);
    if (!date || date < start) continue;
    const key = dateKey(date);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([key, total]) => ({
    dia: new Date(`${key}T00:00:00`),
    total: BigInt(total)
  }));
}

function countErrorLogsByLabel(entries: ErrorLogEntry[], getLabel: (entry: ErrorLogEntry) => string) {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    const label = getLabel(entry);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([label, total]) => ({ label, total: BigInt(total) }))
    .sort((a, b) => Number(b.total - a.total))
    .slice(0, 8);
}

function getErrorLogDate(entry: ErrorLogEntry) {
  const date = new Date(entry.dataHora);
  return Number.isNaN(date.getTime()) ? null : date;
}

function fillDailySeries(start: Date, rows: CountByDay[]) {
  const byKey = new Map(rows.map((row) => [dateKey(row.dia), Number(row.total)]));
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index);
    return {
      label: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      total: byKey.get(dateKey(date)) ?? 0
    };
  });
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
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

function formatPath(path: string) {
  if (path === "/") return "Página inicial";
  try {
    return decodeURIComponent(path).replace(/^\//, "") || "Página inicial";
  } catch {
    return path.replace(/^\//, "") || "Página inicial";
  }
}

function formatErrorStatus(status?: number) {
  if (status === 0) return "Falha de conexão";
  if (!status) return "Sem status";
  if (status === 400) return "Dados inválidos";
  if (status === 401) return "Não autenticado";
  if (status === 403) return "Acesso negado";
  if (status === 404) return "Não encontrado";
  if (status >= 500) return `Erro interno ${status}`;
  return `HTTP ${status}`;
}

function humanizeAction(action: string) {
  const labels: Record<string, string> = {
    CRIAR: "Criar",
    ATUALIZAR: "Atualizar",
    EXCLUIR: "Excluir",
    UPLOAD: "Upload",
    DOWNLOAD: "Download",
    APROVAR: "Aprovar",
    REJEITAR: "Rejeitar",
    ENVIAR_APROVACAO: "Enviar para aprovação",
    ATENDER: "Atender",
    FORCAR_LOGOUT: "Forçar logout",
    ERRO: "Erro",
    Enviar: "Enviar",
    Upload: "Upload",
    Atualizar: "Atualizar",
    Excluir: "Excluir",
    Carregar: "Carregar",
    "Acesso negado": "Acesso negado"
  };
  return labels[action] ?? action;
}

function humanizeEntity(entity: string) {
  return entity
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
