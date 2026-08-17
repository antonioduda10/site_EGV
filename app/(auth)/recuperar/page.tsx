"use client";

import { useState } from "react";

export default function RecuperarSenhaPage() {
  // Guarda o status de retorno do envio de email.
  const [status, setStatus] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    // Envia solicitacao de recuperacao para o endpoint de auth.
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email"));
    const response = await fetch("/api/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    if (response.ok) {
      // Evita expor se o email existe ou nao.
      setStatus("Se o email existir, enviaremos instruções.");
    } else {
      setStatus("Não foi possível processar.");
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-10">
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-6 w-full max-w-md space-y-4">
        <h1 className="text-xl font-semibold">Recuperar senha</h1>
        <div>
          <label className="block text-sm font-medium">Email</label>
          <input name="email" type="email" required className="w-full border rounded px-3 py-2" />
        </div>
        <button type="submit" className="w-full px-4 py-2 rounded bg-brand-600 text-white text-sm">
          Enviar
        </button>
        {status && <p className="text-sm text-slate-600">{status}</p>}
      </form>
    </div>
  );
}
