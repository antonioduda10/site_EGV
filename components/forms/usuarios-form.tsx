"use client";

import { useState } from "react";

export function UsuariosForm() {
  const [status, setStatus] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error" | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    setStatus(null);
    setStatusType(null);
    setIsSaving(true);
    try {
      const response = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));

      setStatus(response.ok ? "Usuário criado." : data.error ?? "Erro ao criar usuário.");
      setStatusType(response.ok ? "success" : "error");
      if (response.ok) form.reset();
    } catch {
      setStatus("Erro de conexão ao criar usuário.");
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
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Novo usuário</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Cadastre uma conta e selecione o perfil inicial de acesso.
          </p>
        </div>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-100 dark:bg-brand-900/30 dark:text-brand-300 dark:ring-brand-900/60">
          Cadastro
        </span>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[1.1fr_1.2fr_0.9fr_0.9fr_auto]">
        <input name="nome" placeholder="Nome" required className={fieldClass} disabled={isSaving} />
        <input name="email" type="email" placeholder="Email" required className={fieldClass} disabled={isSaving} />
        <input name="senha" type="password" placeholder="Senha" required className={fieldClass} disabled={isSaving} />
        <select name="perfil" required className={fieldClass} disabled={isSaving}>
          <option value="">Perfil</option>
          <option value="Admin">Admin</option>
          <option value="Direção">Direção</option>
          <option value="Secretaria">Secretaria</option>
          <option value="Coordenação">Coordenação</option>
          <option value="Comunicação">Comunicação</option>
          <option value="Docente">Docente</option>
          <option value="Aluno">Aluno</option>
          <option value="Responsável">Responsável</option>
        </select>
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 dark:focus:ring-offset-slate-900"
          type="submit"
          disabled={isSaving}
        >
          {isSaving ? "Salvando..." : "Salvar"}
        </button>
      </div>

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
