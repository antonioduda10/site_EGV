"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { newsCoverSizeLabels, newsCoverSizeValues, normalizeNewsCoverSize, type NewsCoverSize } from "@/lib/news-cover-size";

type Noticia = {
  id: string;
  titulo: string;
  resumo: string;
  conteudo: string;
  dataPublicacao: string | null;
  status: string;
  imagemCapa: string | null;
  imagemCapaTamanho: string | null;
};

export function NoticiaCrudActions({ noticia }: { noticia: Noticia }) {
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({
    titulo: noticia.titulo,
    resumo: noticia.resumo,
    conteudo: noticia.conteudo,
    dataPublicacao: noticia.dataPublicacao ? noticia.dataPublicacao.slice(0, 16) : "",
    imagemCapa: noticia.imagemCapa ?? "",
    imagemCapaTamanho: normalizeNewsCoverSize(noticia.imagemCapaTamanho)
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<"salvar" | "pausar" | "remover" | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const router = useRouter();

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setMsg(null);
    setIsUploadingImage(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append("arquivo", file);
      const response = await fetch("/api/noticias/upload", {
        method: "POST",
        body: uploadFormData
      });
      const data = await response.json().catch(() => ({} as { url?: string; error?: string }));
      if (response.ok && data.url) {
        setForm((prev) => ({ ...prev, imagemCapa: data.url ?? "" }));
        setMsg("Imagem enviada com sucesso.");
      } else {
        setMsg(data.error ?? "Não foi possível enviar a imagem.");
      }
    } catch {
      setMsg("Erro de conexão ao enviar imagem.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const salvar = async () => {
    if (loadingAction) return;
    setMsg(null);
    setLoadingAction("salvar");
    try {
      const response = await fetch(`/api/noticias/${noticia.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          imagemCapa: form.imagemCapa || null,
          dataPublicacao: form.dataPublicacao || null
        })
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

  const pausar = async () => {
    if (loadingAction) return;
    setLoadingAction("pausar");
    try {
      const response = await fetch(`/api/noticias/${noticia.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "RASCUNHO" })
      });
      if (response.ok) {
        router.refresh();
      } else {
        const data = await response.json().catch(() => ({}));
        setMsg(data.error ?? "Erro ao pausar.");
      }
    } catch {
      setMsg("Erro de conexão ao pausar.");
    } finally {
      setLoadingAction(null);
    }
  };

  const remover = async () => {
    if (loadingAction) return;
    if (!confirm("Deseja excluir esta notícia?")) return;
    setLoadingAction("remover");
    try {
      const response = await fetch(`/api/noticias/${noticia.id}`, { method: "DELETE" });
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
      <div className="space-y-2">
        <input
          className="w-full border rounded px-2 py-1 text-xs"
          value={form.titulo}
          onChange={(event) => setForm({ ...form, titulo: event.target.value })}
          placeholder="Título"
        />
        <input
          className="w-full border rounded px-2 py-1 text-xs"
          value={form.resumo}
          onChange={(event) => setForm({ ...form, resumo: event.target.value })}
          placeholder="Resumo"
        />
        <textarea
          className="w-full border rounded px-2 py-1 text-xs"
          value={form.conteudo}
          onChange={(event) => setForm({ ...form, conteudo: event.target.value })}
          placeholder="Conteúdo"
          rows={4}
        />
        <input
          className="w-full border rounded px-2 py-1 text-xs"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleImageUpload}
          disabled={Boolean(loadingAction) || isUploadingImage}
        />
        <input
          className="w-full border rounded px-2 py-1 text-xs"
          value={form.imagemCapa}
          onChange={(event) => setForm({ ...form, imagemCapa: event.target.value })}
          placeholder="URL da imagem de capa"
        />
        {form.imagemCapa && (
          <img
            src={form.imagemCapa}
            alt="Pré-visualização da capa"
            className="h-24 w-full rounded border border-slate-200 object-cover"
          />
        )}
        <label className="block space-y-1 text-xs">
          <span className="font-medium text-slate-700 dark:text-slate-200">Tamanho da capa na notícia aberta</span>
          <select
            className="w-full rounded border px-2 py-1 text-xs"
            value={form.imagemCapaTamanho}
            onChange={(event) => setForm({ ...form, imagemCapaTamanho: event.target.value as NewsCoverSize })}
          >
            {newsCoverSizeValues.map((value) => (
              <option key={value} value={value}>
                {newsCoverSizeLabels[value]}
              </option>
            ))}
          </select>
        </label>
        <input
          className="w-full border rounded px-2 py-1 text-xs"
          type="datetime-local"
          value={form.dataPublicacao}
          onChange={(event) => setForm({ ...form, dataPublicacao: event.target.value })}
        />
        <div className="flex gap-2 text-xs">
          <button className="text-brand-600 disabled:opacity-60" type="button" onClick={salvar} disabled={Boolean(loadingAction) || isUploadingImage}>
            {isUploadingImage ? "Enviando imagem..." : loadingAction === "salvar" ? "Salvando..." : "Salvar"}
          </button>
          <button className="text-slate-500 disabled:opacity-60" type="button" onClick={() => setEditando(false)} disabled={Boolean(loadingAction) || isUploadingImage}>
            Cancelar
          </button>
        </div>
        {msg && <p className="text-xs text-slate-500">{msg}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 text-xs">
      <button type="button" onClick={() => setEditando(true)} className="text-brand-600 disabled:opacity-60" disabled={Boolean(loadingAction)}>
        Editar
      </button>
      {noticia.status === "PUBLICADO" || noticia.status === "AGENDADO" ? (
        <button type="button" onClick={pausar} className="text-amber-600 disabled:opacity-60" disabled={Boolean(loadingAction)}>
          {loadingAction === "pausar" ? "Processando..." : "Pausar publicação"}
        </button>
      ) : null}
      <button type="button" onClick={remover} className="text-red-600 disabled:opacity-60" disabled={Boolean(loadingAction)}>
        {loadingAction === "remover" ? "Excluindo..." : "Excluir"}
      </button>
      {msg && <p className="text-xs text-slate-500">{msg}</p>}
    </div>
  );
}
