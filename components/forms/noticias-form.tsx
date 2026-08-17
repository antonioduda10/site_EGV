"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { defaultNewsCoverSize, newsCoverSizeLabels, newsCoverSizeValues, type NewsCoverSize } from "@/lib/news-cover-size";

export function NoticiasForm() {
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [coverSize, setCoverSize] = useState<NewsCoverSize>(defaultNewsCoverSize);
  const router = useRouter();

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setStatus(null);
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("arquivo", file);
      const response = await fetch("/api/noticias/upload", {
        method: "POST",
        body: formData
      });
      const data = await response.json().catch(() => ({} as { url?: string; error?: string }));
      if (response.ok && data.url) {
        setImageUrl(data.url);
        setStatus("Imagem enviada com sucesso.");
      } else {
        setStatus(data.error ?? "Não foi possível enviar a imagem.");
      }
    } catch {
      setStatus("Erro de conexão ao enviar imagem.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    const formEl = event.currentTarget;
    const formData = new FormData(formEl);
    const payload = Object.fromEntries(formData.entries()) as Record<string, FormDataEntryValue>;
    payload.imagemCapa = imageUrl || String(payload.imagemCapa ?? "");
    payload.imagemCapaTamanho = coverSize;
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/noticias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));

      setStatus(response.ok ? "Notícia criada." : data.error ?? "Erro ao salvar notícia.");
      if (response.ok) {
        formEl.reset();
        setImageUrl("");
        setCoverSize(defaultNewsCoverSize);
        router.refresh();
      }
    } catch {
      setStatus("Erro de conexão ao salvar notícia.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="font-semibold text-slate-900 dark:text-slate-100">Nova notícia</h2>
      <input name="titulo" placeholder="Título" required className="w-full rounded border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-950" />
      <input name="resumo" placeholder="Resumo" required className="w-full rounded border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-950" />
      <textarea name="conteudo" placeholder="Conteúdo (texto simples ou HTML)" rows={5} required className="w-full rounded border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-950" />
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Imagem de capa</label>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleImageUpload}
          disabled={isUploadingImage || isSubmitting}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
        />
        <input
          name="imagemCapa"
          value={imageUrl}
          onChange={(event) => setImageUrl(event.target.value)}
          placeholder="Ou cole a URL da imagem de capa"
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
        />
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Pré-visualização da imagem de capa"
            className="h-36 w-full rounded border border-slate-200 object-cover dark:border-slate-800"
          />
        )}
      </div>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Tamanho da capa na notícia aberta
          </span>
          <select
            name="imagemCapaTamanho"
            value={coverSize}
            onChange={(event) => setCoverSize(event.target.value as NewsCoverSize)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          >
            {newsCoverSizeValues.map((value) => (
              <option key={value} value={value}>
                {newsCoverSizeLabels[value]}
              </option>
            ))}
          </select>
        </label>
      <input name="dataPublicacao" type="datetime-local" className="w-full rounded border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-950" />
      <button className="rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60" type="submit" disabled={isSubmitting || isUploadingImage}>
        {isUploadingImage ? "Enviando imagem..." : isSubmitting ? "Salvando..." : "Salvar"}
      </button>
      {status && <p className="text-sm text-slate-600 dark:text-slate-300">{status}</p>}
    </form>
  );
}
