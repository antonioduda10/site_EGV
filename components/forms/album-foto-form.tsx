"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AlbumFotoForm() {
  const [status, setStatus] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error" | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;
    const formEl = event.currentTarget;
    const formData = new FormData(formEl);
    const payload = {
      nome: String(formData.get("nome") ?? ""),
      descricao: String(formData.get("descricao") ?? ""),
      ordem: Number(formData.get("ordem") ?? 0)
    };

    setStatus(null);
    setStatusType(null);
    setIsSaving(true);
    try {
      const response = await fetch("/api/albuns-foto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));
      setStatus(
        response.ok
          ? "Álbum criado."
          : `Erro ${response.status}: ${data.error ?? "Não foi possível criar o álbum."}`
      );
      setStatusType(response.ok ? "success" : "error");

      if (response.ok) {
        formEl.reset();
        router.refresh();
      }
    } catch {
      setStatus("Erro de rede ao criar álbum. Verifique se o servidor está ativo.");
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
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Novo álbum</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Crie uma coleção para organizar fotos por evento ou período.</p>
        </div>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-100 dark:bg-brand-900/30 dark:text-brand-300 dark:ring-brand-900/60">
          Álbum
        </span>
      </div>
      <input name="nome" placeholder="Nome do álbum" required className={`${fieldClass} mt-5`} disabled={isSaving} />
      <textarea
        name="descricao"
        placeholder="Descrição (opcional)"
        rows={2}
        className={`${fieldClass} mt-3`}
        disabled={isSaving}
      />
      <input
        name="ordem"
        type="number"
        min={0}
        defaultValue={0}
        className={`${fieldClass} mt-3`}
        placeholder="Ordem"
        disabled={isSaving}
      />
      <button
        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 dark:focus:ring-offset-slate-900"
        type="submit"
        disabled={isSaving}
      >
        {isSaving ? "Salvando..." : "Criar álbum"}
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
