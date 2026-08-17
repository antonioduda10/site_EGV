"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const setores = ["Direção", "Coordenação", "Secretaria", "Apoio Administrativo"];

const emptyForm = {
  nome: "",
  cargo: "",
  setor: "Secretaria",
  descricao: "",
  fotoUrl: "",
  email: "",
  telefone: "",
  ordem: 0,
  ativo: true
};

export function SecretariaServidorForm() {
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const router = useRouter();

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setStatus(null);
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("arquivo", file);
      const response = await fetch("/api/secretaria/upload", { method: "POST", body: formData });
      const data = await response.json().catch(() => ({} as { url?: string; error?: string }));

      if (response.ok && data.url) {
        setForm((prev) => ({ ...prev, fotoUrl: data.url ?? "" }));
        setStatus("Foto enviada com sucesso.");
      } else {
        setStatus(data.error ?? "Não foi possível enviar a foto.");
      }
    } catch {
      setStatus("Erro de conexão ao enviar foto.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || isUploadingImage) return;

    setStatus(null);
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/secretaria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setForm(emptyForm);
        setStatus("Servidor cadastrado.");
        router.refresh();
      } else {
        setStatus(data.error ?? "Erro ao salvar servidor.");
      }
    } catch {
      setStatus("Erro de conexão ao salvar servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Novo servidor</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Cadastre pessoas da direção, coordenação, secretaria e apoio administrativo que aparecerão na página pública.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Nome</span>
          <input
            required
            value={form.nome}
            onChange={(event) => setForm({ ...form, nome: event.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Cargo ou função</span>
          <input
            required
            value={form.cargo}
            onChange={(event) => setForm({ ...form, cargo: event.target.value })}
            placeholder="Ex: Diretora, Coordenadora, Secretária"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Setor</span>
          <input
            required
            list="secretaria-setores"
            value={form.setor}
            onChange={(event) => setForm({ ...form, setor: event.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
          <datalist id="secretaria-setores">
            {setores.map((setor) => (
              <option key={setor} value={setor} />
            ))}
          </datalist>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Ordem</span>
          <input
            type="number"
            min={0}
            value={form.ordem}
            onChange={(event) => setForm({ ...form, ordem: Number(event.target.value) })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </label>
        <label className="flex items-end gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
          <input
            type="checkbox"
            checked={form.ativo}
            onChange={(event) => setForm({ ...form, ativo: event.target.checked })}
            className="h-4 w-4"
          />
          <span className="font-medium text-slate-700 dark:text-slate-200">Exibir no site</span>
        </label>
      </div>

      <label className="space-y-1 text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-200">Descrição curta</span>
        <textarea
          rows={3}
          value={form.descricao}
          onChange={(event) => setForm({ ...form, descricao: event.target.value })}
          placeholder="Ex: Responsável pelo atendimento às famílias e organização dos documentos escolares."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />
      </label>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">E-mail</span>
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Telefone</span>
          <input
            value={form.telefone}
            onChange={(event) => setForm({ ...form, telefone: event.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_180px]">
        <div className="space-y-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">Foto</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleImageUpload}
              disabled={isUploadingImage || isSubmitting}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>
          <input
            value={form.fotoUrl}
            onChange={(event) => setForm({ ...form, fotoUrl: event.target.value })}
            placeholder="Ou cole uma URL de foto"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>
        <div className="flex min-h-36 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
          {form.fotoUrl ? (
            <img src={form.fotoUrl} alt="Pré-visualização da foto" className="h-full min-h-36 w-full object-cover" />
          ) : (
            <span>Prévia da foto</span>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || isUploadingImage}
        className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {isUploadingImage ? "Enviando foto..." : isSubmitting ? "Salvando..." : "Salvar servidor"}
      </button>
      {status && <p className="text-sm text-slate-600 dark:text-slate-300">{status}</p>}
    </form>
  );
}
