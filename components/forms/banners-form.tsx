"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BannersForm() {
  const [status, setStatus] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error" | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;
    setStatus(null);
    setStatusType(null);

    const formEl = event.currentTarget;
    const formData = new FormData(formEl);

    setIsSaving(true);
    try {
      const response = await fetch("/api/banners", {
        method: "POST",
        body: formData
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setStatus("Banner criado com sucesso.");
        setStatusType("success");
        formEl.reset();
        router.refresh();
      } else {
        setStatus(data.error ?? "Erro ao criar banner.");
        setStatusType("error");
      }
    } catch {
      setStatus("Erro de conexão ao criar banner.");
      setStatusType("error");
    } finally {
      setIsSaving(false);
    }
  };

  const fieldClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-500 dark:focus:ring-brand-900/40 dark:disabled:bg-slate-900";

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Novo banner</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Cadastre uma imagem de destaque para o carrossel da página inicial.
          </p>
        </div>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-100 dark:bg-brand-900/30 dark:text-brand-300 dark:ring-brand-900/60">
          Upload
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_0.7fr]">
        <input
          name="titulo"
          placeholder="Título do banner"
          required
          className={fieldClass}
          disabled={isSaving}
        />
        <input
          name="link"
          placeholder="Link (opcional)"
          className={fieldClass}
          disabled={isSaving}
        />
        <input
          name="ordem"
          type="number"
          placeholder="Ordem"
          defaultValue={0}
          className={fieldClass}
          disabled={isSaving}
        />
      </div>

      <input
        name="descricao"
        placeholder="Descrição (opcional)"
        className={`${fieldClass} mt-3`}
        disabled={isSaving}
      />

      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto]">
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Imagem *</label>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Use JPG, PNG ou WebP em formato horizontal.</p>
          <input
            name="imagem"
            type="file"
            accept="image/*"
            required
            className="mt-3 w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-700 dark:text-slate-300"
            disabled={isSaving}
          />
        </div>
        <label className="flex min-h-16 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
        <input
          name="ativo"
          type="checkbox"
          value="true"
          defaultChecked
          disabled={isSaving}
          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900"
        />
          Ativo
        </label>
      </div>

      <button
        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 dark:focus:ring-offset-slate-900"
        type="submit"
        disabled={isSaving}
      >
        {isSaving ? "Salvando..." : "Salvar banner"}
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
