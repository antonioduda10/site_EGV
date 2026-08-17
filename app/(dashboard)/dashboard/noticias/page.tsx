import { db } from "@/lib/db";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { NoticiasForm } from "@/components/forms/noticias-form";
import { NoticiasActionButton } from "@/components/dashboard/noticias-actions";
import { NoticiaCrudActions } from "@/components/dashboard/noticia-crud-actions";
import { requirePermission } from "@/lib/require-permission";
import { Permissions } from "@/lib/permissions";

export default async function NoticiasDashboard() {
  const { allowed } = await requirePermission(Permissions.NEWS_READ);
  if (!allowed) {
    return (
      <div>
        <DashboardTopbar title="Notícias" />
        <div className="p-6 text-sm text-slate-600">Sem permissão para acessar.</div>
      </div>
    );
  }
  const noticias = await db.noticia.findMany({
    orderBy: { dataCadastro: "desc" }
  });
  // Separa noticias pendentes para aprovacao rapida.
  const pendentes = noticias.filter((n) => n.status === "ENVIADO_PARA_APROVACAO");

  return (
    <div>
      <DashboardTopbar title="Notícias" />
      <div className="p-6 grid gap-6">
        <NoticiasForm />
        {pendentes.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 p-4 text-sm font-semibold text-slate-800 dark:border-slate-800 dark:text-slate-100">Pendentes de aprovação</div>
            <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="p-3">Título</th>
                  <th className="p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {pendentes.map((noticia) => (
                  <tr key={noticia.id} className="border-b border-slate-100 last:border-b-0 dark:border-slate-800/70">
                    <td className="p-3 font-medium text-slate-800 dark:text-slate-100">{noticia.titulo}</td>
                    <td className="p-3 flex gap-3 text-sm">
                      <NoticiasActionButton noticiaId={noticia.id} mode="aprovar" />
                      <NoticiasActionButton noticiaId={noticia.id} mode="rejeitar" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="p-3">Título</th>
                <th className="p-3">Status</th>
                <th className="p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {noticias.map((noticia) => (
                <tr key={noticia.id} className="border-b border-slate-100 last:border-b-0 dark:border-slate-800/70">
                  <td className="p-3 font-medium text-slate-800 dark:text-slate-100">{noticia.titulo}</td>
                  <td className="p-3 text-sm text-slate-600 dark:text-slate-300">{noticia.status}</td>
                  <td className="p-3 text-sm">
                    <div className="flex flex-col gap-2">
                      <NoticiasActionButton noticiaId={noticia.id} mode="enviar" />
                      <NoticiaCrudActions
                        noticia={{
                          id: noticia.id,
                          titulo: noticia.titulo,
                          resumo: noticia.resumo,
                          conteudo: noticia.conteudo,
                          dataPublicacao: noticia.dataPublicacao
                            ? noticia.dataPublicacao.toISOString()
                            : null,
                          status: noticia.status,
                          imagemCapa: noticia.imagemCapa ?? null,
                          imagemCapaTamanho: noticia.imagemCapaTamanho ?? null
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
  );
}
