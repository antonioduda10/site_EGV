"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toPublicUrl } from "@/lib/uploads-url";

type SecretariaServidor = {
  id: string;
  nome: string;
  cargo: string;
  setor: string;
  descricao: string | null;
  fotoUrl: string | null;
  email: string | null;
  telefone: string | null;
  ordem: number;
  ativo: boolean;
};

export function SecretariaServidorActions({ servidor }: { servidor: SecretariaServidor }) {
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({
    nome: servidor.nome,
    cargo: servidor.cargo,
    setor: servidor.setor,
    descricao: servidor.descricao ?? "",
    fotoUrl: servidor.fotoUrl ?? "",
    email: servidor.email ?? "",
    telefone: servidor.telefone ?? "",
    ordem: servidor.ordem,
    ativo: servidor.ativo
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [loadingAction, setLoadingAction] = useState<"salvar" | "status" | "remover" | null>(null);
  const router = useRouter();

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setMsg(null);
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("arquivo", file);
      const response = await fetch("/api/secretaria/upload", { method: "POST", body: formData });
      const data = await response.json().catch(() => ({} as { url?: string; error?: string }));

      if (response.ok && data.url) {
        setForm((prev) => ({ ...prev, fotoUrl: data.url ?? "" }));
        setMsg("Foto enviada com sucesso.");
      } else {
        setMsg(data.error ?? "Não foi possível enviar a foto.");
      }
    } catch {
      setMsg("Erro de conexão ao enviar foto.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const salvar = async () => {
    if (loadingAction || isUploadingImage) return;
    setMsg(null);
    setLoadingAction("salvar");
    try {
      const response = await fetch(`/api/secretaria/${servidor.id}`, {
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

  const toggleStatus = async () => {
    if (loadingAction) return;
    setMsg(null);
    setLoadingAction("status");
    try {
      const response = await fetch(`/api/secretaria/${servidor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: !servidor.ativo })
      });

      if (response.ok) {
        router.refresh();
      } else {
        const data = await response.json().catch(() => ({}));
        setMsg(data.error ?? "Erro ao alterar status.");
      }
    } catch {
      setMsg("Erro de conexão ao alterar status.");
    } finally {
      setLoadingAction(null);
    }
  };

  const remover = async () => {
    if (loadingAction) return;
    if (!confirm("Deseja excluir este servidor da página da secretaria?")) return;
    setMsg(null);
    setLoadingAction("remover");
    try {
      const response = await fetch(`/api/secretaria/${servidor.id}`, { method: "DELETE" });
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
      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
        <div className="grid gap-2 md:grid-cols-2">
          <input className="rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} placeholder="Nome" />
          <input className="rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={form.cargo} onChange={(event) => setForm({ ...form, cargo: event.target.value })} placeholder="Cargo" />
          <input className="rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={form.setor} onChange={(event) => setForm({ ...form, setor: event.target.value })} placeholder="Setor" />
          <input className="rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" type="number" min={0} value={form.ordem} onChange={(event) => setForm({ ...form, ordem: Number(event.target.value) })} placeholder="Ordem" />
        </div>
        <textarea className="w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" rows={3} value={form.descricao} onChange={(event) => setForm({ ...form, descricao: event.target.value })} placeholder="Descrição" />
        <div className="grid gap-2 md:grid-cols-2">
          <input className="rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="E-mail" />
          <input className="rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={form.telefone} onChange={(event) => setForm({ ...form, telefone: event.target.value })} placeholder="Telefone" />
        </div>
        <div className="grid gap-2 md:grid-cols-[1fr_120px]">
          <div className="space-y-2">
            <input className="w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageUpload} disabled={Boolean(loadingAction) || isUploadingImage} />
            <input className="w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={form.fotoUrl} onChange={(event) => setForm({ ...form, fotoUrl: event.target.value })} placeholder="URL da foto" />
          </div>
          <div className="h-28 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            {form.fotoUrl ? (
              <img src={toPublicUrl(form.fotoUrl)} alt="Prévia da foto" className="h-full w-full object-cover" />
            ) : null}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
          <input type="checkbox" checked={form.ativo} onChange={(event) => setForm({ ...form, ativo: event.target.checked })} />
          Exibir no site
        </label>
        <div className="flex flex-wrap gap-3 text-sm">
          <button type="button" onClick={salvar} disabled={Boolean(loadingAction) || isUploadingImage} className="font-semibold text-brand-700 disabled:opacity-60 dark:text-brand-300">
            {isUploadingImage ? "Enviando foto..." : loadingAction === "salvar" ? "Salvando..." : "Salvar"}
          </button>
          <button type="button" onClick={() => setEditando(false)} disabled={Boolean(loadingAction) || isUploadingImage} className="font-semibold text-slate-500 disabled:opacity-60">
            Cancelar
          </button>
        </div>
        {msg && <p className="text-xs text-slate-500 dark:text-slate-400">{msg}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3 text-sm">
      <button type="button" onClick={() => setEditando(true)} className="font-semibold text-brand-700 disabled:opacity-60 dark:text-brand-300" disabled={Boolean(loadingAction)}>
        Editar
      </button>
      <button type="button" onClick={toggleStatus} className="font-semibold text-amber-600 disabled:opacity-60" disabled={Boolean(loadingAction)}>
        {loadingAction === "status" ? "Processando..." : servidor.ativo ? "Ocultar" : "Exibir"}
      </button>
      <button type="button" onClick={remover} className="font-semibold text-red-600 disabled:opacity-60" disabled={Boolean(loadingAction)}>
        {loadingAction === "remover" ? "Excluindo..." : "Excluir"}
      </button>
      {msg && <p className="basis-full text-xs text-slate-500 dark:text-slate-400">{msg}</p>}
    </div>
  );
}
