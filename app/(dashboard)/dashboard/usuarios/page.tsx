import { db } from "@/lib/db";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { UsuariosForm } from "@/components/forms/usuarios-form";
import { UsuarioPermissoes } from "@/components/dashboard/usuario-permissoes";
import { UsuarioActions } from "@/components/dashboard/usuario-actions";
import { UsuariosOnlineAutoRefresh } from "@/components/dashboard/usuarios-online-auto-refresh";
import type { ReactNode } from "react";
import { requirePermission } from "@/lib/require-permission";
import { Permissions } from "@/lib/permissions";
import { isProtectedSuperAdmin } from "@/lib/super-master";
import { getPermissionsForRoles } from "@/lib/rbac";

export default async function UsuariosPage() {
  // Controla acesso ao gerenciamento de usuarios.
  const { allowed, session } = await requirePermission(Permissions.USERS_READ);
  const { allowed: canManageUsers } = await requirePermission(Permissions.USERS_WRITE);
  const { allowed: canForceLogout } = await requirePermission(Permissions.USERS_FORCE_LOGOUT);
  if (!allowed) {
    return (
      <div>
        <DashboardTopbar title="Usuários" />
        <div className="p-6 text-sm text-slate-600">Sem permissão para acessar.</div>
      </div>
    );
  }
  const usuarios = await db.usuario.findMany({
    include: { perfis: { include: { perfil: true } }, permissoes: true },
    orderBy: { nome: "asc" }
  });
  let sessoesAtivas: Array<{ usuarioId: string }> = [];
  try {
    sessoesAtivas = await db.$queryRaw<Array<{ usuarioId: string }>>`
      SELECT "usuarioId"
      FROM "SessaoAtiva"
      WHERE "ultimoPingEm" >= NOW() - INTERVAL '20 seconds'
    `;
  } catch {
    sessoesAtivas = [];
  }
  const usuariosOnline = new Set(sessoesAtivas.map((item) => item.usuarioId));

  // Filtra o super admin da lista, exceto se o usuário logado for o próprio super admin
  const usuariosFiltrados = usuarios.filter((usuario) => {
    if (isProtectedSuperAdmin(usuario)) {
      return session?.user?.id === usuario.id;
    }
    return true;
  });
  const onlineCount = usuariosFiltrados.filter((usuario) => usuariosOnline.has(usuario.id)).length;
  const ativosCount = usuariosFiltrados.filter((usuario) => usuario.status?.toUpperCase() === "ATIVO").length;
  const superAdminsCount = usuariosFiltrados.filter((usuario) => usuario.superAdmin).length;

  return (
    <div>
      <DashboardTopbar title="Usuários" />
      <UsuariosOnlineAutoRefresh />
      <div className="grid gap-6 p-6">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-0 lg:grid-cols-[1fr_320px]">
            <div className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700 dark:text-brand-300">
                Controle de acesso
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                Usuários do painel administrativo
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Gerencie contas, perfis, permissões e sessões ativas com segurança, mantendo o acesso de cada servidor bem definido.
              </p>
            </div>
            <div className="flex items-center border-t border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950/50 lg:border-l lg:border-t-0">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Online agora</p>
                <p className="mt-1 text-4xl font-bold text-emerald-700 dark:text-emerald-300">{onlineCount}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Atualização automática a cada poucos segundos.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ResumoCard title="Usuários" value={usuariosFiltrados.length} hint="Contas visíveis para seu acesso" tone="brand" />
          <ResumoCard title="Contas ativas" value={ativosCount} hint="Usuários com status ativo" tone="emerald" />
          <ResumoCard title="Online" value={onlineCount} hint="Sessões ativas neste momento" tone="sky" />
          <ResumoCard title="Super Admin" value={superAdminsCount} hint="Contas administrativas protegidas" tone="slate" />
        </section>

        {canManageUsers ? (
          <UsuariosForm />
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
            Você possui acesso de leitura. Para criar, editar ou excluir usuários, habilite a permissão
            Gerenciar usuários.
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 p-5 dark:border-slate-800">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Usuários cadastrados</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Lista com perfis, permissões e ações disponíveis para cada conta.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {usuariosFiltrados.length} registro(s)
              </span>
            </div>
          </div>
          {usuariosFiltrados.length === 0 ? (
            <div className="p-6 text-sm text-slate-600 dark:text-slate-300">Nenhum usuário encontrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
                    <th className="p-4">Usuário</th>
                    <th className="p-4">Perfil</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Permissões</th>
                    <th className="p-4">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosFiltrados.map((usuario) => {
                    const isSelf = session?.user?.id === usuario.id;
                    const protegidoSuperAdmin = isProtectedSuperAdmin(usuario);
                    const bloqueado = (protegidoSuperAdmin && !isSelf) || !canManageUsers;
                    const permissoesManuais = usuario.permissoes.map((p) => p.permissao);
                    const permissoesEfetivas = permissoesManuais.length
                      ? permissoesManuais
                      : Array.from(new Set(getPermissionsForRoles(usuario.perfis.map((p) => p.perfil.nome as never))));
                    const online = usuariosOnline.has(usuario.id);
                    return (
                      <tr key={usuario.id} className="border-b border-slate-100 align-top last:border-b-0 dark:border-slate-800/70">
                        <td className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="relative">
                              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-sm font-bold text-brand-700 ring-1 ring-brand-100 dark:bg-brand-900/30 dark:text-brand-300 dark:ring-brand-900/60">
                                {getInitials(usuario.nome)}
                              </div>
                              {online && (
                                <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 dark:text-slate-100">{usuario.nome}</p>
                              <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{usuario.email}</p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {online && <Badge tone="emerald">Online</Badge>}
                                {isSelf && <Badge tone="brand">Você</Badge>}
                                {usuario.superAdmin && <Badge tone="slate">Super Admin</Badge>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
                          <div className="flex flex-wrap gap-2">
                            {usuario.perfis.length ? (
                              usuario.perfis.map((p) => <Badge key={p.id} tone="sky">{p.perfil.nome}</Badge>)
                            ) : (
                              <span className="text-slate-400">Sem perfil</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge tone={usuario.status?.toUpperCase() === "ATIVO" ? "emerald" : "amber"}>
                            {usuario.status || "Sem status"}
                          </Badge>
                        </td>
                        <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
                          <UsuarioPermissoes
                            usuarioId={usuario.id}
                            permissoesAtuais={permissoesEfetivas}
                            bloqueado={bloqueado}
                          />
                          {bloqueado && (
                            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                              {protegidoSuperAdmin && !isSelf
                                ? "Super administrador protegido, não editável por esta conta."
                                : "Somente leitura: sua conta não possui permissão para gerenciar usuários."}
                            </p>
                          )}
                        </td>
                        <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
                          <UsuarioActions
                            usuarioId={usuario.id}
                            nome={usuario.nome}
                            email={usuario.email}
                            status={usuario.status}
                            perfilAtual={usuario.perfis[0]?.perfil?.nome ?? ""}
                            usuarioOnline={online}
                            isSelf={isSelf}
                            podeDeslogar={canForceLogout}
                            bloqueado={bloqueado}
                            protegidoExclusao={protegidoSuperAdmin}
                          />
                        </td>
                      </tr>
                    );
                  })}
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
  tone: "brand" | "emerald" | "sky" | "slate";
}) {
  const toneClasses = {
    brand: "bg-brand-50 text-brand-700 ring-brand-100 dark:bg-brand-900/30 dark:text-brand-300 dark:ring-brand-900/60",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60",
    sky: "bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900/60",
    slate: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700"
  }[tone];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${toneClasses}`}>{title}</div>
      <p className="mt-4 text-3xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{hint}</p>
    </div>
  );
}

function Badge({ children, tone }: { children: ReactNode; tone: "brand" | "emerald" | "sky" | "amber" | "slate" }) {
  const toneClasses = {
    brand: "bg-brand-50 text-brand-700 ring-brand-100 dark:bg-brand-900/30 dark:text-brand-300 dark:ring-brand-900/60",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60",
    sky: "bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900/60",
    amber: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60",
    slate: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700"
  }[tone];

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${toneClasses}`}>
      {children}
    </span>
  );
}

function getInitials(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";
}
