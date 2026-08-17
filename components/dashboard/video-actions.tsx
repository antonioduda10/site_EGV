"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Video = {
  id: string;
  titulo: string;
  descricao: string | null;
  url: string;
  modoExibicao: string;
};

export function VideoActions({ video }: { video: Video }) {
  const [editando, setEditando] = useState(false);
  const [titulo, setTitulo] = useState(video.titulo);
  const [descricao, setDescricao] = useState(video.descricao ?? "");
  const [url, setUrl] = useState(video.url);
  const [modoExibicao, setModoExibicao] = useState(video.modoExibicao ?? "AUTO");
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
      const response = await fetch(`/api/videos/${video.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo, descricao, url, modoExibicao })
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
      setMsg("Erro de conexão ao atualizar.");
    } finally {
      setLoadingAction(null);
    }
  };

  const remover = async () => {
    if (loadingAction) return;
    if (!confirm("Deseja excluir este vídeo?")) return;
    setMsg(null);
    setLoadingAction("remover");
    try {
      const response = await fetch(`/api/videos/${video.id}`, { method: "DELETE" });
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

  if (editando) {
    return (
      <div className="min-w-[260px] space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/60">
        <input
          className={fieldClass}
          value={titulo}
          onChange={(event) => setTitulo(event.target.value)}
          placeholder="Título"
          disabled={Boolean(loadingAction)}
        />
        <textarea
          className={fieldClass}
          value={descricao}
          onChange={(event) => setDescricao(event.target.value)}
          placeholder="Descrição"
          rows={2}
          disabled={Boolean(loadingAction)}
        />
        <input
          className={fieldClass}
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="URL"
          disabled={Boolean(loadingAction)}
        />
        <select
          className={fieldClass}
          value={modoExibicao}
          onChange={(event) => setModoExibicao(event.target.value)}
          disabled={Boolean(loadingAction)}
        >
          <option value="AUTO">Automático (recomendado)</option>
          <option value="EMBED">Tentar incorporar no site</option>
          <option value="EXTERNO">Abrir sempre no YouTube</option>
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
