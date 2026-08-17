import { db } from "@/lib/db";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { SecretariaServidorActions } from "@/components/dashboard/secretaria-servidor-actions";
import { SecretariaServidorForm } from "@/components/forms/secretaria-servidor-form";
import { Permissions } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { toPublicUrl } from "@/lib/uploads-url";

export default async function SecretariaDashboardPage() {
  const { allowed } = await requirePermission(Permissions.PAGES_WRITE);
  if (!allowed) {
    return (
      <div>
        <DashboardTopbar title="Secretaria" />
        <div className="p-6 text-sm text-slate-600 dark:text-slate-300">Sem permissão para acessar.</div>
      </div>
    );
  }

  const servidores = await db.secretariaServidor.findMany({
    orderBy: [{ ordem: "asc" }, { setor: "asc" }, { nome: "asc" }]
  });

  return (
    <div>
      <DashboardTopbar title="Secretaria" />
      <div className="grid gap-6 p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700 dark:text-brand-300">
            Página pública
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Equipe da Secretaria</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
            Cadastre as pessoas que aparecerão em /secretaria. A página pode ser adicionada ao Acesso Rápido nas configurações da home.
          </p>
        </div>

        <SecretariaServidorForm />

        {servidores.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            Nenhum servidor cadastrado ainda.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {servidores.map((servidor) => (
              <article key={servidor.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-col gap-4 p-4 sm:flex-row">
                  <div className="h-36 w-full shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:w-32 dark:bg-slate-800">
                    {servidor.fotoUrl ? (
                      <img
                        src={toPublicUrl(servidor.fotoUrl)}
                        alt={servidor.nome}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-brand-700 dark:text-brand-300">
                        {getInitials(servidor.nome)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{servidor.nome}</h2>
                        <p className="text-sm font-medium text-brand-700 dark:text-brand-300">{servidor.cargo}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${servidor.ativo ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>
                        {servidor.ativo ? "Visível" : "Oculto"}
                      </span>
                    </div>
                    <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{servidor.setor}</p>
                    {servidor.descricao && <p className="mt-2 line-clamp-3 text-sm text-slate-600 dark:text-slate-300">{servidor.descricao}</p>}
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>Ordem {servidor.ordem}</span>
                      {servidor.email && <span>{servidor.email}</span>}
                      {servidor.telefone && <span>{servidor.telefone}</span>}
                    </div>
                  </div>
                </div>
                <div className="border-t border-slate-100 p-4 dark:border-slate-800">
                  <SecretariaServidorActions
                    servidor={{
                      id: servidor.id,
                      nome: servidor.nome,
                      cargo: servidor.cargo,
                      setor: servidor.setor,
                      descricao: servidor.descricao,
                      fotoUrl: servidor.fotoUrl,
                      email: servidor.email,
                      telefone: servidor.telefone,
                      ordem: servidor.ordem,
                      ativo: servidor.ativo
                    }}
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
