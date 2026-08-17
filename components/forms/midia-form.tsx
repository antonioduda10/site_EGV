"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type MidiaFormProps = {
  title?: string;
  accept?: string;
  helperText?: string;
  enableAlbums?: boolean;
  albums?: Array<{ id: string; nome: string }>;
};

export function MidiaForm({
  title = "Nova foto",
  accept = "image/*",
  helperText = "Formatos aceitos: imagens (JPG/PNG/WebP).",
  enableAlbums = false,
  albums = []
}: MidiaFormProps) {
  const [status, setStatus] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error" | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isUploading) return;
    const formEl = event.currentTarget;
    const formData = new FormData(formEl);
    setStatus(null);
    setStatusType(null);
    setIsUploading(true);
    try {
      const response = await fetch("/api/midia", {
        method: "POST",
        body: formData
      });

      const data = await response.json().catch(() => ({}));

      setStatus(response.ok ? "Arquivo enviado." : data.error ?? "Erro no envio.");
      setStatusType(response.ok ? "success" : "error");
      if (response.ok) {
        formEl.reset();
        router.refresh();
      }
    } catch {
      setStatus("Erro de conexão no envio.");
      setStatusType("error");
    } finally {
      setIsUploading(false);
    }
  };

  const fieldClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-500 dark:focus:ring-brand-900/40 dark:disabled:bg-slate-900";

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Envie o arquivo e informe os dados de exibição.</p>
        </div>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-100 dark:bg-brand-900/30 dark:text-brand-300 dark:ring-brand-900/60">
          Upload
        </span>
      </div>
      <input name="titulo" placeholder="Título" required className={`${fieldClass} mt-5`} disabled={isUploading} />
      <textarea
        name="descricao"
        placeholder="Descrição curta (opcional)"
        rows={2}
        className={`${fieldClass} mt-3`}
        disabled={isUploading}
      />
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Data da foto/vídeo (opcional)</label>
          <input name="dataReferencia" type="date" className={fieldClass} disabled={isUploading} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Ordem de exibição</label>
          <input name="ordem" type="number" min={0} defaultValue={0} className={fieldClass} disabled={isUploading} />
        </div>
      </div>
      {enableAlbums && (
        <div className="mt-3 space-y-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Álbum</label>
          <select name="albumId" className={fieldClass} defaultValue="" disabled={isUploading}>
            <option value="">Sem álbum</option>
            {albums.map((album) => (
              <option key={album.id} value={album.id}>
                {album.nome}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Arquivo</label>
        <input
          name="arquivo"
          type="file"
          accept={accept}
          required
          className="mt-3 w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-700 dark:text-slate-300"
          disabled={isUploading}
        />
      </div>
      <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-300">{helperText}</p>
      <button
        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 dark:focus:ring-offset-slate-900"
        type="submit"
        disabled={isUploading}
      >
        {isUploading ? "Enviando..." : "Upload"}
      </button>
      {status && (
        <p
          className={`mt-4 rounded-xl px-3 py-2 text-sm ${
            statusType === "success"
              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
              : "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200"
          }`}
        >
          {status}
        </p>
      )}
    </form>
  );
}
