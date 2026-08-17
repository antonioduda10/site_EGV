"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CoverOption = {
  id: string;
  titulo: string;
};

type AlbumFoto = {
  id: string;
  nome: string;
  descricao?: string | null;
  ordem: number;
  capaMidiaId?: string | null;
};

export function AlbumFotoActions({ album, coverOptions }: { album: AlbumFoto; coverOptions: CoverOption[] }) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(album.nome);
  const [descricao, setDescricao] = useState(album.descricao ?? "");
  const [ordem, setOrdem] = useState(album.ordem);
  const [capaMidiaId, setCapaMidiaId] = useState(album.capaMidiaId ?? "");
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
      const response = await fetch(`/api/albuns-foto/${album.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          descricao,
          ordem,
          capaMidiaId: capaMidiaId || null
        })
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setMsg("Atualizado.");
        setEditando(false);
        router.refresh();
      } else {
        setMsg(`Erro ${response.status}: ${data.error ?? "Não foi possível atualizar o álbum."}`);
      }
    } catch {
      setMsg("Erro de rede ao atualizar álbum.");
    } finally {
      setLoadingAction(null);
    }
  };

  const remover = async () => {
    if (loadingAction) return;
    if (!confirm("Deseja excluir este álbum?")) return;
    setMsg(null);
    setLoadingAction("remover");
    try {
      const response = await fetch(`/api/albuns-foto/${album.id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        router.refresh();
      } else {
        setMsg(`Erro ${response.status}: ${data.error ?? "Não foi possível excluir o álbum."}`);
      }
    } catch {
      setMsg("Erro de rede ao excluir álbum.");
    } finally {
      setLoadingAction(null);
    }
  };

  if (editando) {
    return (
      <div className="min-w-[240px] space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/60">
        <input
          className={fieldClass}
          value={nome}
          onChange={(event) => setNome(event.target.value)}
          placeholder="Nome"
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
          type="number"
          min={0}
          value={ordem}
          onChange={(event) => setOrdem(Number(event.target.value))}
          placeholder="Ordem"
          disabled={Boolean(loadingAction)}
        />
        <select
          className={fieldClass}
          value={capaMidiaId}
          onChange={(event) => setCapaMidiaId(event.target.value)}
          disabled={Boolean(loadingAction)}
        >
          <option value="">Sem capa definida</option>
          {coverOptions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.titulo}
            </option>
          ))}
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
