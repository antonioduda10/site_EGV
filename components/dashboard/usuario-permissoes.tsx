"use client";

import { useState } from "react";
import { Permissions } from "@/lib/permissions";

type Props = {
  usuarioId: string;
  permissoesAtuais: string[];
  bloqueado?: boolean;
};

const INTERNAL_NONE = Permissions.INTERNAL_NO_PERMISSIONS;

const permissionSections = [
  {
    title: "Dashboard",
    permissions: [
      Permissions.DASHBOARD_READ,
      Permissions.REPORTS_READ
    ]
  },
  {
    title: "Conteúdo",
    permissions: [
      Permissions.NEWS_READ,
      Permissions.NEWS_WRITE,
      Permissions.NEWS_APPROVE,
      Permissions.EVENTS_WRITE,
      Permissions.DOCS_WRITE,
      Permissions.PAGES_WRITE,
      Permissions.BANNERS_WRITE,
      Permissions.CONFIG_WRITE,
      Permissions.CONTACTS_READ,
      Permissions.CONTACTS_WRITE
    ]
  },
  {
    title: "Mídia",
    permissions: [
      Permissions.MEDIA_WRITE,
      Permissions.VIDEOS_WRITE
    ]
  },
  {
    title: "Administração",
    permissions: [
      Permissions.USERS_READ,
      Permissions.USERS_WRITE,
      Permissions.USERS_FORCE_LOGOUT
    ]
  }
];

const permissionLabels: Record<string, string> = {
  DASHBOARD_READ: "Ver visão geral",
  USERS_READ: "Ler usuários",
  USERS_WRITE: "Gerenciar usuários",
  USERS_FORCE_LOGOUT: "Deslogar usuários",
  NEWS_READ: "Ler notícias",
  NEWS_WRITE: "Criar/editar notícias",
  NEWS_APPROVE: "Aprovar notícias",
  EVENTS_WRITE: "Gerenciar eventos",
  DOCS_WRITE: "Gerenciar documentos",
  PAGES_WRITE: "Gerenciar páginas",
  BANNERS_WRITE: "Gerenciar banners",
  CONFIG_WRITE: "Gerenciar configurações",
  MEDIA_WRITE: "Gerenciar fotos",
  VIDEOS_WRITE: "Gerenciar vídeos",
  CONTACTS_READ: "Ver contatos",
  CONTACTS_WRITE: "Gerenciar contatos",
  REPORTS_READ: "Ver relatórios"
};

export function UsuarioPermissoes({ usuarioId, permissoesAtuais, bloqueado }: Props) {
  const [selecionadas, setSelecionadas] = useState<string[]>(
    permissoesAtuais.filter((perm) => perm !== INTERNAL_NONE)
  );
  const [status, setStatus] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const toggle = (perm: string) => {
    setSelecionadas((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const salvar = async () => {
    if (salvando) return;
    setStatus(null);
    const payloadPermissions =
      selecionadas.length === 0
        ? [INTERNAL_NONE]
        : selecionadas.filter((perm) => perm !== INTERNAL_NONE);
    setSalvando(true);
    try {
      const response = await fetch(`/api/usuarios/${usuarioId}/permissoes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: payloadPermissions })
      });

      setStatus(response.ok ? "Permissões salvas." : "Erro ao salvar permissões.");
    } catch {
      setStatus("Erro de conexão ao salvar permissões.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
        {permissionSections.map((section) => (
          <div key={section.title} className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{section.title}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {section.permissions.map((perm) => (
                <label
                  key={perm}
                  className="flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
                >
                  <input
                    type="checkbox"
                    checked={selecionadas.includes(perm)}
                    onChange={() => toggle(perm)}
                    disabled={bloqueado || salvando}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900"
                  />
                  {permissionLabels[perm] ?? perm}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={salvar}
        disabled={bloqueado || salvando}
        className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {salvando ? "Salvando..." : "Salvar permissões"}
      </button>
      {selecionadas.length === 0 && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          Nenhuma permissão ativa (acesso bloqueado).
        </p>
      )}
      {status && <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-300">{status}</p>}
    </div>
  );
}
