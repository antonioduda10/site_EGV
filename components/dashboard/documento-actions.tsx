"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Documento = {
  id: string;
  nome: string;
  categoria: string;
  ano: number;
  descricao: string | null;
  status: string;
  ordem: number;
};

type DocumentoActionsProps = {
  doc: Documento;
  prevOrdem?: number | null;
  nextOrdem?: number | null;
};

export function DocumentoActions({ doc, prevOrdem, nextOrdem }: DocumentoActionsProps) {
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({
    nome: doc.nome,
    categoria: doc.categoria,
    ano: doc.ano,
    descricao: doc.descricao ?? "",
    status: doc.status,
    ordem: doc.ordem
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<"subir" | "descer" | "salvar" | "remover" | null>(null);
  const router = useRouter();
  const fieldClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-500 dark:focus:ring-brand-900/40 dark:disabled:bg-slate-900";

  const atualizarOrdem = async (novaOrdem: number) => {
    if (loadingAction) return;
    setMsg(null);
    try {
      const response = await fetch(`/api/documentos/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, ordem: novaOrdem })
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setForm((prev) => ({ ...prev, ordem: novaOrdem }));
        router.refresh();
      } else {
        setMsg(data.error ?? "Erro ao atualizar.");
      }
    } catch {
      setMsg("Erro de conexão ao atualizar ordem.");
    }
  };

  const subir = async () => {
    if (prevOrdem === null || prevOrdem === undefined) return;
    setLoadingAction("subir");
    const novaOrdem = prevOrdem < form.ordem ? prevOrdem : prevOrdem - 1;
    await atualizarOrdem(novaOrdem);
    setLoadingAction(null);
  };

  const descer = async () => {
    if (nextOrdem === null || nextOrdem === undefined) return;
    setLoadingAction("descer");
    const novaOrdem = nextOrdem > form.ordem ? nextOrdem : nextOrdem + 1;
    await atualizarOrdem(novaOrdem);
    setLoadingAction(null);
  };

  const salvar = async () => {
    if (loadingAction) return;
    setMsg(null);
    setLoadingAction("salvar");
    try {
      const response = await fetch(`/api/documentos/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
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

  const remover = async () => {
    if (loadingAction) return;
    if (!confirm("Deseja excluir este documento?")) return;
    setLoadingAction("remover");
    try {
      const response = await fetch(`/api/documentos/${doc.id}`, { method: "DELETE" });
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
      <div className="min-w-[240px] space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/60">
        <input
          className={fieldClass}
          value={form.nome}
          onChange={(event) => setForm({ ...form, nome: event.target.value })}
          placeholder="Nome"
        />
        <input
          className={fieldClass}
          value={form.categoria}
          onChange={(event) => setForm({ ...form, categoria: event.target.value })}
          placeholder="Categoria"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            className={fieldClass}
            type="number"
            value={form.ano}
            onChange={(event) => setForm({ ...form, ano: Number(event.target.value) })}
            placeholder="Ano"
          />
          <input
            className={fieldClass}
            type="number"
            value={form.ordem}
            onChange={(event) => setForm({ ...form, ordem: Number(event.target.value) })}
            placeholder="Ordem"
          />
        </div>
        <input
          className={fieldClass}
          value={form.descricao}
          onChange={(event) => setForm({ ...form, descricao: event.target.value })}
          placeholder="Descrição"
        />
        <select
          className={fieldClass}
          value={form.status}
          onChange={(event) => setForm({ ...form, status: event.target.value })}
        >
          <option value="ATIVO">Publicado</option>
          <option value="INATIVO">Pausado</option>
        </select>
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
    <div className="flex min-w-[132px] flex-col gap-2 text-xs">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={subir}
          disabled={prevOrdem === null || prevOrdem === undefined || Boolean(loadingAction)}
          className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
        >
          {loadingAction === "subir" ? "Processando..." : "Subir"}
        </button>
        <button
          type="button"
          onClick={descer}
          disabled={nextOrdem === null || nextOrdem === undefined || Boolean(loadingAction)}
          className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
        >
          {loadingAction === "descer" ? "Processando..." : "Descer"}
        </button>
      </div>
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
