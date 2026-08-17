"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  usuarioId: string;
  nome: string;
  email: string;
  status: string;
  perfilAtual?: string;
  usuarioOnline?: boolean;
  isSelf?: boolean;
  podeDeslogar?: boolean;
  bloqueado?: boolean;
  protegidoExclusao?: boolean;
};

type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

export function UsuarioActions({ usuarioId, nome, email, status, perfilAtual, usuarioOnline, isSelf, podeDeslogar, bloqueado, protegidoExclusao }: Props) {
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({ nome, email, status, senha: "", perfil: perfilAtual ?? "" });
  const [msg, setMsg] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<"salvar" | "remover" | "deslogar" | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const router = useRouter();

  useEffect(() => {
    if (!toast) return;
    const timeoutId = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const fieldClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-500 dark:focus:ring-brand-900/40 dark:disabled:bg-slate-900";

  const salvar = async () => {
    if (loadingAction) return;
    setMsg(null);
    const payload = { ...form };
    if (!payload.senha) delete (payload as { senha?: string }).senha;
    if (payload.senha && payload.senha.length < 6) {
      setMsg("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }
    setLoadingAction("salvar");
    try {
      const response = await fetch(`/api/usuarios/${usuarioId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({} as { error?: string }));

      if (response.ok) {
        setMsg("Atualizado.");
        setEditando(false);
        router.refresh();
      } else {
        setMsg(data.error ?? "Erro ao atualizar.");
      }
    } catch {
      setMsg("Erro de conexão ao salvar.");
    } finally {
      setLoadingAction(null);
    }
  };

  const remover = async () => {
    if (loadingAction) return;
    if (isSelf) {
      setMsg("Você não pode excluir seu próprio usuário.");
      return;
    }
    if (protegidoExclusao) {
      setMsg("Super administrador protegido não pode ser excluído.");
      return;
    }
    if (!confirm("Deseja excluir este usuário?")) return;
    setLoadingAction("remover");
    try {
      const response = await fetch(`/api/usuarios/${usuarioId}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({} as { error?: string }));
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

  const deslogar = async () => {
    if (loadingAction) return;
    setMsg(null);
    if (isSelf) {
      setToast({ type: "error", message: "Não é possível deslogar sua própria sessão por este botão." });
      return;
    }
    if (!confirm("Deseja deslogar este usuário em todos os dispositivos?")) return;
    setLoadingAction("deslogar");
    try {
      const response = await fetch(`/api/usuarios/${usuarioId}/deslogar`, { method: "POST" });
      const data = await response.json().catch(() => ({} as { error?: string }));
      if (response.ok) {
        setToast({ type: "success", message: "Usuário deslogado com sucesso." });
        router.refresh();
        return;
      }
      const message = data.error ?? "Erro ao deslogar usuário.";
      setMsg(message);
      setToast({ type: "error", message });
    } catch {
      const message = "Erro de conexão ao deslogar usuário.";
      setMsg(message);
      setToast({ type: "error", message });
    } finally {
      setLoadingAction(null);
    }
  };

  if (editando) {
    return (
      <div className="min-w-[220px] space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/60">
        <input
          className={fieldClass}
          value={form.nome}
          onChange={(event) => setForm({ ...form, nome: event.target.value })}
          placeholder="Nome"
        />
        <input
          className={fieldClass}
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
          placeholder="Email"
        />
        <input
          className={fieldClass}
          value={form.senha}
          onChange={(event) => setForm({ ...form, senha: event.target.value })}
          placeholder="Nova senha"
          type="password"
        />
        <input
          className={fieldClass}
          value={form.status}
          onChange={(event) => setForm({ ...form, status: event.target.value })}
          placeholder="Status"
        />
        <select
          className={fieldClass}
          value={form.perfil}
          onChange={(event) => setForm({ ...form, perfil: event.target.value })}
        >
          <option value="">Perfil</option>
          <option value="Admin">Admin</option>
          <option value="Direção">Direção</option>
          <option value="Secretaria">Secretaria</option>
          <option value="Coordenação">Coordenação</option>
          <option value="Comunicação">Comunicação</option>
          <option value="Docente">Docente</option>
          <option value="Aluno">Aluno</option>
          <option value="Responsável">Responsável</option>
        </select>
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            className="rounded-lg bg-brand-600 px-3 py-2 font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            onClick={salvar}
            disabled={Boolean(loadingAction)}
          >
            {loadingAction === "salvar" ? "Salvando..." : "Salvar"}
          </button>
          <button
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            type="button"
            onClick={() => setEditando(false)}
            disabled={Boolean(loadingAction)}
          >
            Cancelar
          </button>
        </div>
        {msg && <p className="rounded-lg bg-white px-3 py-2 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300">{msg}</p>}
      </div>
    );
  }

  return (
    <>
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-4 right-4 z-50 rounded-md border px-4 py-3 text-sm shadow-lg ${
            toast.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
          }`}
        >
          {toast.message}
        </div>
      )}
      <div className="flex min-w-[120px] flex-col gap-2 text-xs">
        <button
          type="button"
          onClick={() => setEditando(true)}
          className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 font-semibold text-brand-700 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-brand-900/60 dark:bg-brand-900/30 dark:text-brand-300 dark:hover:bg-brand-900/50"
          disabled={bloqueado || Boolean(loadingAction)}
        >
          Editar
        </button>
        <button
          type="button"
          onClick={remover}
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/70"
          disabled={bloqueado || protegidoExclusao || isSelf || Boolean(loadingAction)}
        >
          {loadingAction === "remover" ? "Excluindo..." : "Excluir"}
        </button>
        {usuarioOnline && (
          <button
          type="button"
          onClick={deslogar}
            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-950/70"
            disabled={bloqueado || !podeDeslogar || isSelf || Boolean(loadingAction)}
          >
            {loadingAction === "deslogar" ? "Processando..." : "Deslogar"}
          </button>
        )}
        {msg && <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-300">{msg}</p>}
      </div>
    </>
  );
}
