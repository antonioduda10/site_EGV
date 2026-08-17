"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Banner = {
  id: string;
  titulo: string;
  descricao: string | null;
  imagem: string;
  link: string | null;
  ordem: number;
  ativo: boolean;
};

export function BannerActions({ banner }: { banner: Banner }) {
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({
    titulo: banner.titulo,
    descricao: banner.descricao || "",
    link: banner.link || "",
    ordem: banner.ordem,
    ativo: banner.ativo
  });
  const [imagem, setImagem] = useState<File | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<"salvar" | "remover" | null>(null);
  const router = useRouter();
  const fieldClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-500 dark:focus:ring-brand-900/40 dark:disabled:bg-slate-900";

  const salvar = async () => {
    if (loadingAction) return;
    setMsg(null);
    const formData = new FormData();
    formData.append("titulo", form.titulo);
    formData.append("descricao", form.descricao);
    formData.append("link", form.link);
    formData.append("ordem", String(form.ordem));
    formData.append("ativo", String(form.ativo));
    if (imagem) {
      formData.append("imagem", imagem);
    }

    setLoadingAction("salvar");
    try {
      const response = await fetch(`/api/banners/${banner.id}`, {
        method: "PATCH",
        body: formData
      });

      if (response.ok) {
        setMsg("Atualizado.");
        setImagem(null);
        setEditando(false);
        router.refresh();
      } else {
        const data = await response.json().catch(() => ({} as { error?: string }));
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
    if (!confirm("Deseja excluir este banner?")) return;
    setMsg(null);
    setLoadingAction("remover");
    try {
      const response = await fetch(`/api/banners/${banner.id}`, { method: "DELETE" });
      if (response.ok) {
        router.refresh();
      } else {
        const data = await response.json().catch(() => ({} as { error?: string }));
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
          value={form.titulo}
          onChange={(e) => setForm({ ...form, titulo: e.target.value })}
          placeholder="Título"
          disabled={Boolean(loadingAction)}
        />
        <input
          className={fieldClass}
          value={form.descricao}
          onChange={(e) => setForm({ ...form, descricao: e.target.value })}
          placeholder="Descrição"
          disabled={Boolean(loadingAction)}
        />
        <input
          className={fieldClass}
          value={form.link}
          onChange={(e) => setForm({ ...form, link: e.target.value })}
          placeholder="Link"
          disabled={Boolean(loadingAction)}
        />
        <input
          className={fieldClass}
          type="number"
          value={form.ordem}
          onChange={(e) => setForm({ ...form, ordem: Number(e.target.value) })}
          placeholder="Ordem"
          disabled={Boolean(loadingAction)}
        />
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">Trocar imagem</label>
          <input
            className="mt-2 w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-brand-700 dark:text-slate-300"
            type="file"
            accept="image/*"
            disabled={Boolean(loadingAction)}
            onChange={(e) => setImagem(e.target.files?.[0] ?? null)}
          />
        </div>
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <input
            type="checkbox"
            checked={form.ativo}
            onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
            disabled={Boolean(loadingAction)}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900"
          />
          Ativo
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
