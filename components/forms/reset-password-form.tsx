"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { newPasswordError, PASSWORD_POLICY_MESSAGE } from "@/lib/password-policy";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") ?? null;
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const senha = String(data.get("senha") ?? "");
    if (token && newPasswordError(senha)) { setStatus(PASSWORD_POLICY_MESSAGE); return; }
    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch(token ? "/api/auth/reset" : "/api/auth/forgot", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(token ? { token, senha } : { email: String(data.get("email") ?? "") })
      });
      const result = await response.json().catch(() => ({}));
      setStatus(response.ok ? (token ? "Senha redefinida. Entre novamente para continuar." : "Se o email existir, enviaremos instruções.") : result.error ?? "Não foi possível processar.");
      if (response.ok) { form.reset(); if (token) setComplete(true); }
    } catch { setStatus("Não foi possível processar. Verifique sua conexão."); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900" aria-busy={busy}>
      <h1 className="text-xl font-semibold">{token ? "Redefinir senha" : "Recuperar senha"}</h1>
      {!complete && <>
        <label className="block text-sm font-medium">
          {token ? "Nova senha" : "Email"}
          <input name={token ? "senha" : "email"} type={token ? "password" : "email"} required disabled={busy} autoComplete={token ? "new-password" : "email"} aria-describedby={token ? "reset-senha-regra" : undefined} className="mt-1 w-full rounded border px-3 py-2 dark:border-slate-700 dark:bg-slate-950" />
        </label>
        {token && <p id="reset-senha-regra" className="text-sm text-slate-600 dark:text-slate-300">{PASSWORD_POLICY_MESSAGE}</p>}
        <button type="submit" disabled={busy} className="min-h-11 w-full rounded bg-brand-600 px-4 py-2 text-sm text-white disabled:opacity-60">{busy ? "Enviando..." : token ? "Redefinir senha" : "Enviar"}</button>
      </>}
      {status && <p role="status" className="text-sm text-slate-600 dark:text-slate-300">{status}</p>}
      {complete && <Link href="/login" className="inline-block py-2">Ir para o login</Link>}
    </form>
  );
}
