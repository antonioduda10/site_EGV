"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function BannerCarouselSettingsForm({ initialIntervalMs }: { initialIntervalMs: number }) {
  const [intervalSeconds, setIntervalSeconds] = useState(() => Math.round(initialIntervalMs / 1000));
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<"success" | "error" | null>(null);
  const router = useRouter();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setStatus(null);
    setStatusKind(null);

    try {
      const response = await fetch("/api/banners/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bannerIntervalMs: intervalSeconds * 1000 })
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(data.error ?? "Erro ao salvar o tempo do carrossel.");
        setStatusKind("error");
        return;
      }

      setStatus("Tempo do carrossel salvo.");
      setStatusKind("success");
      router.refresh();
    } catch {
      setStatus("Erro de conexão ao salvar o tempo do carrossel.");
      setStatusKind("error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="overflow-hidden rounded-2xl border border-brand-200 bg-white shadow-sm dark:border-brand-900/60 dark:bg-slate-900"
    >
      <div className="grid gap-0 lg:grid-cols-[1fr_360px]">
        <div className="p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700 dark:text-brand-300">
            Carrossel principal
          </p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
            Tempo de troca automática
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            Ajuste a velocidade com que os banners da página inicial alternam quando há mais de um banner ativo.
          </p>

          <label className="mt-5 block space-y-2">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Trocar banner a cada {intervalSeconds} segundos
            </span>
            <input
              type="range"
              min={3}
              max={15}
              step={1}
              value={intervalSeconds}
              onChange={(event) => setIntervalSeconds(Number(event.target.value))}
              className="w-full accent-brand-600"
              disabled={saving}
            />
          </label>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>3s</span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            <span>15s</span>
          </div>
        </div>

        <div className="flex flex-col justify-center border-t border-brand-100 bg-brand-50/70 p-5 dark:border-brand-900/60 dark:bg-brand-950/20 lg:border-l lg:border-t-0">
          <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm dark:border-brand-900/60 dark:bg-slate-950/70">
            <p className="text-sm text-slate-600 dark:text-slate-300">Tempo atual</p>
            <p className="mt-1 text-3xl font-bold text-brand-700 dark:text-brand-300">{intervalSeconds}s</p>
            <button
              type="submit"
              disabled={saving}
              className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-brand-500 dark:hover:bg-brand-400 dark:focus:ring-offset-slate-950"
            >
              {saving ? "Salvando..." : "Salvar tempo"}
            </button>
          </div>
          {status && (
            <p
              className={`mt-3 rounded-xl px-3 py-2 text-sm ${
                statusKind === "success"
                  ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                  : "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200"
              }`}
            >
              {status}
            </p>
          )}
        </div>
      </div>
    </form>
  );
}
