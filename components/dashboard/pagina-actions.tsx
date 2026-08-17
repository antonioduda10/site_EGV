"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PaginaEditor } from "@/components/forms/pagina-editor";

type Pagina = {
  id: string;
  titulo: string;
  slug: string;
  conteudo: string;
  visivel: boolean;
  ordem: number;
};

export function PaginaActions({ pagina }: { pagina: Pagina }) {
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({
    titulo: pagina.titulo,
    slug: pagina.slug,
    conteudo: pagina.conteudo,
    visivel: pagina.visivel,
    ordem: pagina.ordem
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<"salvar" | "remover" | null>(null);
  const router = useRouter();
  const fieldClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-500 dark:focus:ring-brand-900/40 dark:disabled:bg-slate-900";

  const salvar = async () => {
    if (loadingAction) return;
    setMsg(null);
    setLoadingAction("salvar");
    try {
      const response = await fetch(`/api/paginas/${pagina.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await response.json().catch(() => ({}));
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
    if (!confirm("Deseja excluir esta página?")) return;
    setMsg(null);
    setLoadingAction("remover");
    try {
      const response = await fetch(`/api/paginas/${pagina.id}`, { method: "DELETE" });
      if (response.ok) {
        router.refresh();
      } else {
        const data = await response.json().catch(() => ({}));
        setMsg(data.error ?? "Erro ao excluir.");
      }
    } catch {
      setMsg("Erro de conexão ao excluir.");
    } finally {
      setLoadingAction(null);
    }
  };

  if (editando) {
    return (
      <div className="min-w-[340px] space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/60">
        <input
          className={fieldClass}
          value={form.titulo}
          onChange={(event) => setForm({ ...form, titulo: event.target.value })}
          placeholder="Título"
        />
        <input
          className={fieldClass}
          value={form.slug}
          onChange={(event) => setForm({ ...form, slug: event.target.value })}
          placeholder="Slug"
        />
        <div className="rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
          <PaginaEditor
            value={form.conteudo}
            onChange={(value) => setForm({ ...form, conteudo: value })}
            helperText="Edite o texto e insira imagens com os botões acima."
          />
        </div>
        <input
          className={fieldClass}
          type="number"
          value={form.ordem}
          onChange={(event) => setForm({ ...form, ordem: Number(event.target.value) })}
          placeholder="Ordem"
        />
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <input
            type="checkbox"
            checked={form.visivel}
            onChange={(event) => setForm({ ...form, visivel: event.target.checked })}
            disabled={Boolean(loadingAction)}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900"
          />
          Visível
        </label>
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
    <div className="flex min-w-[120px] flex-col gap-2 text-xs">
      <button
        type="button"
        onClick={() => setEditando(true)}
        className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 font-semibold text-brand-700 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-brand-900/60 dark:bg-brand-900/30 dark:text-brand-300 dark:hover:bg-brand-900/50"
        disabled={Boolean(loadingAction)}
      >
        Editar
      </button>
      <button
        type="button"
        onClick={remover}
        className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/70"
        disabled={Boolean(loadingAction)}
      >
        {loadingAction === "remover" ? "Excluindo..." : "Excluir"}
      </button>
      {msg && <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-300">{msg}</p>}
    </div>
  );
}
