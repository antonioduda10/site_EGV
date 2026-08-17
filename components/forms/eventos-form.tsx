"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PaginaEditor } from "@/components/forms/pagina-editor";

export function EventosForm() {
  const [status, setStatus] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error" | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [conteudo, setConteudo] = useState("<p></p>");
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;
    const formEl = event.currentTarget;
    const formData = new FormData(formEl);
    const payload = Object.fromEntries(formData.entries());
    const descricao = String(payload.descricao ?? "");
    const conteudoValue = normalizeConteudo(conteudo, descricao);

    setStatus(null);
    setStatusType(null);
    setIsSaving(true);
    try {
      const response = await fetch("/api/eventos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          conteudo: conteudoValue,
          dataFim: payload.dataFim || null
        })
      });

      const data = await response.json().catch(() => ({}));

      setStatus(response.ok ? "Evento criado." : data.error ?? "Erro ao salvar evento.");
      setStatusType(response.ok ? "success" : "error");
      if (response.ok) {
        formEl.reset();
        setConteudo("<p></p>");
        router.refresh();
      }
    } catch {
      setStatus("Erro de conexão ao salvar evento.");
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
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Novo evento</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Preencha os dados principais e adicione imagens ou detalhes no conteúdo completo.
          </p>
        </div>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-100 dark:bg-brand-900/30 dark:text-brand-300 dark:ring-brand-900/60">
          Cadastro
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <input name="titulo" placeholder="Título" required className={fieldClass} disabled={isSaving} />
        <input name="local" placeholder="Local" required className={fieldClass} disabled={isSaving} />
      </div>
      <input
        name="descricao"
        placeholder="Resumo/descrição curta"
        required
        className={`${fieldClass} mt-3`}
        disabled={isSaving}
      />
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <input
          name="dataInicio"
          type="datetime-local"
          required
          className={fieldClass}
          disabled={isSaving}
        />
        <input
          name="dataFim"
          type="datetime-local"
          className={fieldClass}
          disabled={isSaving}
        />
        <input
          name="ordem"
          type="number"
          min={0}
          placeholder="Ordem"
          className={fieldClass}
          disabled={isSaving}
        />
      </div>
      <div className="mt-4 space-y-2">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Conteúdo do evento</label>
        <PaginaEditor
          value={conteudo}
          onChange={setConteudo}
          uploadEndpoint="/api/eventos/upload"
          helperText="Insira fotos, links e texto completo do evento. A primeira imagem aparece como capa no site público."
        />
      </div>
      <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-300">
        A ordem funciona como posição: se usar uma posição já ocupada, os demais eventos serão reorganizados automaticamente.
      </p>
      <button
        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 dark:focus:ring-offset-slate-900"
        type="submit"
        disabled={isSaving}
      >
        {isSaving ? "Salvando..." : "Salvar"}
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

function normalizeConteudo(value: string, fallback: string) {
  const trimmed = value.trim();
  const normalized = trimmed.replace(/\s+/g, " ");
  if (!normalized || normalized === "<p></p>" || normalized === "<p><br></p>") {
    return `<p>${fallback}</p>`;
  }
  return value;
}
