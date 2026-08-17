"use client";

import { useState } from "react";

export function ContatoForm() {
  const [status, setStatus] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<"success" | "error" | null>(null);
  const [enviadoComSucesso, setEnviadoComSucesso] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    setStatusKind(null);
    const formEl = event.currentTarget;
    setEnviando(true);

    try {
      const formData = new FormData(formEl);
      const payload = Object.fromEntries(formData.entries());

      const response = await fetch("/api/contato", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setStatus("Mensagem enviada com sucesso.");
        setStatusKind("success");
        setEnviadoComSucesso(true);
        formEl.reset();
      } else {
        setStatusKind("error");
        setStatus(data?.error ?? "Não foi possível enviar. Tente novamente.");
      }
    } catch {
      setStatusKind("error");
      setStatus("Falha de conexão ao enviar. Verifique a internet e tente novamente.");
    } finally {
      setEnviando(false);
    }
  };

  if (enviadoComSucesso) {
    return (
      <div className="space-y-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-400/30 dark:bg-emerald-950/30">
        <div>
          <p className="text-base font-semibold text-emerald-900 dark:text-emerald-100">Mensagem enviada com sucesso.</p>
          <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">
            Obrigado pelo contato. A equipe da escola poderá acompanhar sua solicitação pelo painel administrativo.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-brand-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-400"
          onClick={() => {
            setEnviadoComSucesso(false);
            setStatus(null);
            setStatusKind(null);
          }}
        >
          Enviar nova mensagem
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" aria-busy={enviando}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100" htmlFor="contato-nome">
            Nome
          </label>
          <input
            id="contato-nome"
            name="nome"
            required
            minLength={3}
            disabled={enviando}
            placeholder="Seu nome completo"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100" htmlFor="contato-email">
            E-mail
          </label>
          <input
            id="contato-email"
            name="email"
            type="email"
            required
            disabled={enviando}
            placeholder="seuemail@exemplo.com"
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100" htmlFor="contato-assunto">
          Assunto
        </label>
        <input
          id="contato-assunto"
          name="assunto"
          required
          minLength={3}
          disabled={enviando}
          placeholder="Sobre o que deseja falar?"
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100" htmlFor="contato-destino">
          Destino
        </label>
        <select
          id="contato-destino"
          name="perfilDestino"
          defaultValue="Direção"
          disabled={enviando}
          className={inputClass}
        >
          <option value="Direção">Direção</option>
          <option value="Secretaria">Secretaria</option>
          <option value="Coordenação">Coordenação</option>
          <option value="Comunicação">Comunicação</option>
          <option value="Docente">Docente</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100" htmlFor="contato-mensagem">
          Mensagem
        </label>
        <textarea
          id="contato-mensagem"
          name="mensagem"
          rows={6}
          minLength={10}
          required
          disabled={enviando}
          placeholder="Descreva sua solicitação com detalhes."
          className={`${inputClass} resize-y`}
        />
      </div>
      <button
        className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-brand-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-brand-500 dark:hover:bg-brand-400 sm:w-auto"
        type="submit"
        disabled={enviando}
      >
        {enviando ? "Enviando..." : "Enviar mensagem"}
      </button>
      {status && (
        <p
          role="status"
          className={`rounded-2xl px-3 py-2 text-sm font-medium ${
            statusKind === "error"
              ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200"
              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
          }`}
        >
          {status}
        </p>
      )}
    </form>
  );
}

const inputClass =
  "mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-900";
