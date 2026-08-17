"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PaginaEditor } from "@/components/forms/pagina-editor";

type Evento = {
  id: string;
  titulo: string;
  descricao: string;
  conteudo: string;
  dataInicio: string;
  dataFim: string | null;
  local: string;
  ordem: number;
  status: string;
};

export function EventoActions({ evento }: { evento: Evento }) {
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({
    titulo: evento.titulo,
    descricao: evento.descricao,
    conteudo: evento.conteudo,
    dataInicio: toInputDateTime(evento.dataInicio),
    dataFim: evento.dataFim ? toInputDateTime(evento.dataFim) : "",
    local: evento.local,
    ordem: evento.ordem
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<"salvar" | "status" | "remover" | null>(null);
  const router = useRouter();
  const fieldClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-500 dark:focus:ring-brand-900/40 dark:disabled:bg-slate-900";

  const salvar = async () => {
    if (loadingAction) return;
    setMsg(null);
    setLoadingAction("salvar");
    try {
      const response = await fetch(`/api/eventos/${evento.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          conteudo: normalizeConteudo(form.conteudo, form.descricao),
          dataFim: form.dataFim || null
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

  const toggleStatus = async () => {
    if (loadingAction) return;
    const nextStatus = evento.status === "PUBLICADO" ? "RASCUNHO" : "PUBLICADO";
    setLoadingAction("status");
    try {
      const response = await fetch(`/api/eventos/${evento.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      if (response.ok) {
        router.refresh();
      } else {
        const data = await response.json().catch(() => ({}));
        setMsg(data.error ?? "Erro ao atualizar status.");
      }
    } catch {
      setMsg("Erro de conexão ao processar.");
    } finally {
      setLoadingAction(null);
    }
  };

  const remover = async () => {
    if (loadingAction) return;
    if (!confirm("Deseja excluir este evento?")) return;
    setLoadingAction("remover");
    try {
      const response = await fetch(`/api/eventos/${evento.id}`, { method: "DELETE" });
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
      <div className="min-w-[340px] space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/60">
        <input
          className={fieldClass}
          value={form.titulo}
          onChange={(event) => setForm({ ...form, titulo: event.target.value })}
          placeholder="Título"
        />
        <input
          className={fieldClass}
          value={form.descricao}
          onChange={(event) => setForm({ ...form, descricao: event.target.value })}
          placeholder="Descrição"
        />
        <div className="rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
          <PaginaEditor
            value={form.conteudo}
            onChange={(value) => setForm({ ...form, conteudo: value })}
            uploadEndpoint="/api/eventos/upload"
            helperText="Edite o conteúdo do evento com imagens e links. A primeira imagem aparece como capa no site público."
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            className={fieldClass}
            type="datetime-local"
            value={form.dataInicio}
            onChange={(event) => setForm({ ...form, dataInicio: event.target.value })}
          />
          <input
            className={fieldClass}
            type="datetime-local"
            value={form.dataFim}
            onChange={(event) => setForm({ ...form, dataFim: event.target.value })}
          />
        </div>
        <input
          className={fieldClass}
          value={form.local}
          onChange={(event) => setForm({ ...form, local: event.target.value })}
          placeholder="Local"
        />
        <input
          className={fieldClass}
          type="number"
          min={0}
          value={form.ordem}
          onChange={(event) => setForm({ ...form, ordem: Number(event.target.value) })}
          placeholder="Ordem"
        />
        <p className="rounded-lg bg-white px-3 py-2 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300">
          Se a posição já existir, os demais eventos serão reorganizados automaticamente.
        </p>
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
    <div className="flex min-w-[118px] flex-col gap-2 text-xs">
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
        onClick={toggleStatus}
        className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-950/70"
        disabled={Boolean(loadingAction)}
      >
        {loadingAction === "status" ? "Processando..." : evento.status === "PUBLICADO" ? "Pausar" : "Publicar"}
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

function toInputDateTime(value: string) {
  const date = new Date(value);
  const pad = (item: number) => String(item).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function normalizeConteudo(value: string, fallback: string) {
  const trimmed = value.trim();
  const normalized = trimmed.replace(/\s+/g, " ");
  if (!normalized || normalized === "<p></p>" || normalized === "<p><br></p>") {
    return `<p>${fallback}</p>`;
  }
  return value;
}
