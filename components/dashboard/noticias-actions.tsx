"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  noticiaId: string;
  mode: "enviar" | "aprovar" | "rejeitar";
};

export function NoticiasActionButton({ noticiaId, mode }: Props) {
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleClick = async () => {
    if (isLoading) return;
    setStatus(null);
    setIsLoading(true);
    const endpoint =
      mode === "enviar"
        ? `/api/noticias/${noticiaId}/enviar-aprovacao`
        : mode === "aprovar"
        ? `/api/noticias/${noticiaId}/aprovar`
        : `/api/noticias/${noticiaId}/rejeitar`;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: mode === "rejeitar" ? JSON.stringify({ motivo: "" }) : undefined
      });

      if (response.ok) {
        setStatus(
          mode === "enviar"
            ? "Enviado para aprovação."
            : mode === "aprovar"
            ? "Notícia aprovada."
            : "Notícia rejeitada."
        );
        router.refresh();
      } else {
        setStatus("Não foi possível concluir a ação.");
      }
    } catch {
      setStatus("Erro de conexão ao concluir a ação.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadingText = mode === "enviar"
    ? "Enviando..."
    : mode === "aprovar"
    ? "Processando..."
    : "Processando...";

  const buttonText = mode === "enviar"
    ? "Enviar aprovação"
    : mode === "aprovar"
    ? "Aprovar"
    : "Rejeitar";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className={
          mode === "rejeitar"
            ? "text-red-600 disabled:opacity-60"
            : "text-brand-600 disabled:opacity-60"
        }
      >
        {isLoading ? loadingText : buttonText}
      </button>
      {status && <span className="text-xs text-slate-500">{status}</span>}
    </div>
  );
}
