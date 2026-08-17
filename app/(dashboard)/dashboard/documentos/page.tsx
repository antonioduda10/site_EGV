import { db } from "@/lib/db";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { DocumentosForm } from "@/components/forms/documentos-form";
import { requirePermission } from "@/lib/require-permission";
import { Permissions } from "@/lib/permissions";
import { DocumentoActions } from "@/components/dashboard/documento-actions";
import type { ReactNode } from "react";

export default async function DocumentosDashboard() {
  const { allowed } = await requirePermission(Permissions.DOCS_WRITE);
  if (!allowed) {
    return (
      <div>
        <DashboardTopbar title="Documentos" />
        <div className="p-6 text-sm text-slate-600">Sem permissão para acessar.</div>
      </div>
    );
  }
  // Ordena por prioridade e data para o painel.
  const documentos = await db.arquivoDocumento.findMany({
    orderBy: [{ ordem: "asc" }, { dataUpload: "desc" }]
  });
  const publicados = documentos.filter((doc) => doc.status === "ATIVO").length;
  const pausados = documentos.filter((doc) => doc.status === "INATIVO").length;
  const categorias = new Set(documentos.map((doc) => doc.categoria).filter(Boolean)).size;
  const ultimoDocumento = [...documentos].sort((a, b) => b.dataUpload.getTime() - a.dataUpload.getTime())[0];

  return (
    <div>
      <DashboardTopbar title="Documentos" />
      <div className="grid gap-6 p-6">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-0 lg:grid-cols-[1fr_340px]">
            <div className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700 dark:text-brand-300">
                Acervo digital
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                Gerencie os documentos publicados
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Organize arquivos, categorias, versões e status para manter a área pública de documentos clara e atualizada.
              </p>
            </div>
            <div className="flex items-center border-t border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950/50 lg:border-l lg:border-t-0">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Envio mais recente</p>
                {ultimoDocumento ? (
                  <>
                    <p className="mt-1 truncate text-xl font-semibold text-slate-900 dark:text-slate-100">{ultimoDocumento.nome}</p>
                    <p className="mt-1 text-sm text-brand-700 dark:text-brand-300">{formatDate(ultimoDocumento.dataUpload)}</p>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Nenhum documento enviado ainda.</p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ResumoCard title="Documentos" value={documentos.length} hint="Total cadastrado" tone="brand" />
          <ResumoCard title="Publicados" value={publicados} hint="Visíveis no site público" tone="emerald" />
          <ResumoCard title="Pausados" value={pausados} hint="Arquivos inativos" tone="amber" />
          <ResumoCard title="Categorias" value={categorias} hint="Agrupamentos em uso" tone="sky" />
        </section>

        <DocumentosForm />

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 p-5 dark:border-slate-800">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Documentos cadastrados</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  A ordem define prioridade de exibição; versões e status seguem o fluxo já existente.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {documentos.length} registro(s)
              </span>
            </div>
          </div>
          {documentos.length === 0 ? (
            <div className="p-6 text-sm text-slate-600 dark:text-slate-300">Nenhum documento enviado ainda.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
                    <th className="p-4">Documento</th>
                    <th className="p-4">Categoria</th>
                    <th className="p-4">Ordem</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Arquivo</th>
                    <th className="p-4">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {documentos.map((doc, index) => (
                    <tr key={doc.id} className="border-b border-slate-100 align-top last:border-b-0 dark:border-slate-800/70">
                      <td className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xs font-bold text-brand-700 ring-1 ring-brand-100 dark:bg-brand-900/30 dark:text-brand-300 dark:ring-brand-900/60">
                            {fileShortLabel(doc.tipo)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 dark:text-slate-100">{doc.nome}</p>
                            {doc.descricao && (
                              <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{doc.descricao}</p>
                            )}
                            <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                              Enviado em {formatDate(doc.dataUpload)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
                        <div className="flex flex-wrap gap-2">
                          <Badge tone="sky">{doc.categoria}</Badge>
                          <Badge tone="slate">{doc.ano}</Badge>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          <Badge tone="slate">#{doc.ordem}</Badge>
                          <Badge tone="brand">v{doc.versao}</Badge>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge tone={doc.status === "ATIVO" ? "emerald" : "amber"}>
                          {doc.status === "ATIVO" ? "Publicado" : "Pausado"}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
                        <p>{fileTypeLabel(doc.tipo)}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatBytes(doc.tamanho)}</p>
                      </td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
                        <DocumentoActions
                          doc={doc}
                          prevOrdem={documentos[index - 1]?.ordem ?? null}
                          nextOrdem={documentos[index + 1]?.ordem ?? null}
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

function Badge({ children, tone }: { children: ReactNode; tone: "brand" | "emerald" | "amber" | "sky" | "slate" }) {
  const toneClasses = {
    brand: "bg-brand-50 text-brand-700 ring-brand-100 dark:bg-brand-900/30 dark:text-brand-300 dark:ring-brand-900/60",
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

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function fileShortLabel(type: string) {
  if (type.includes("pdf")) return "PDF";
  if (type.includes("word")) return "DOC";
  if (type.includes("spreadsheet") || type.includes("excel")) return "XLS";
  if (type.includes("image")) return "IMG";
  return "ARQ";
}

function fileTypeLabel(type: string) {
  if (type.includes("pdf")) return "PDF";
  if (type.includes("word")) return "Documento Word";
  if (type.includes("spreadsheet") || type.includes("excel")) return "Planilha";
  if (type.includes("image")) return "Imagem";
  return type || "Arquivo";
}

function formatBytes(value: number) {
  if (!value) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: unitIndex === 0 ? 0 : 1 }).format(size)} ${units[unitIndex]}`;
}
