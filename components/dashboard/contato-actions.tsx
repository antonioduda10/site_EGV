"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Contato = {
  id: string;
  statusAtendimento: string;
};

export function ContatoActions({ contato, bloqueado }: { contato: Contato; bloqueado?: boolean }) {
  const [status, setStatus] = useState(contato.statusAtendimento);
  const [msg, setMsg] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<"salvar" | "remover" | null>(null);
  const router = useRouter();

  const salvar = async () => {
    if (loadingAction || bloqueado) return;
    setMsg(null);
    setLoadingAction("salvar");
    try {
      const response = await fetch(`/api/contato/${contato.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusAtendimento: status })
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setMsg("Atualizado.");
        router.refresh();
      } else {
        setMsg(data.error ?? "Erro ao atualizar.");
      }
    } catch {
      setMsg("Erro de conexão ao atualizar.");
    } finally {
      setLoadingAction(null);
    }
  };

  const remover = async () => {
    if (loadingAction || bloqueado) return;
    if (!confirm("Deseja excluir este contato?")) return;
    setMsg(null);
    setLoadingAction("remover");
    try {
      const response = await fetch(`/api/contato/${contato.id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        router.refresh();
      } else {
        setMsg(data.error ?? "Erro ao excluir.");
      }
    } catch {
      setMsg("Erro de conexão ao excluir.");
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="min-w-[160px] space-y-2">
      <select
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-brand-500 dark:focus:ring-brand-900/40 dark:disabled:bg-slate-900"
        value={status}
        onChange={(event) => setStatus(event.target.value)}
        disabled={bloqueado || Boolean(loadingAction)}
      >
        <option value="NOVO">Novo</option>
        <option value="EM_ANDAMENTO">Em andamento</option>
        <option value="RESOLVIDO">Resolvido</option>
      </select>
      <div className="flex gap-2 text-xs">
        <button
          type="button"
          className="flex-1 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 font-semibold text-brand-700 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-brand-900/60 dark:bg-brand-900/30 dark:text-brand-300 dark:hover:bg-brand-900/50"
          onClick={salvar}
          disabled={bloqueado || Boolean(loadingAction)}
        >
          {loadingAction === "salvar" ? "Salvando..." : "Salvar"}
        </button>
        <button
          type="button"
          className="flex-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/70"
          onClick={remover}
          disabled={bloqueado || Boolean(loadingAction)}
        >
          {loadingAction === "remover" ? "Excluindo..." : "Excluir"}
        </button>
      </div>
      {bloqueado && <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-950 dark:text-slate-400">Somente leitura</p>}
      {msg && <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-300">{msg}</p>}
    </div>
  );
}
