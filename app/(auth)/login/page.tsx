"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

type FieldErrors = {
  email?: string;
  password?: string;
};

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginShell />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginShell() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-10">
      <div className="bg-white border border-slate-200 rounded-lg p-6 w-full max-w-md space-y-4">
        <h1 className="text-xl font-semibold">Acesso ao portal</h1>
        <p className="text-sm text-slate-600">Carregando formulário de acesso...</p>
      </div>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionDerrubada = searchParams?.get("reason") === "session-invalidated";
  // Guarda mensagem de erro de autenticacao.
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const validateFields = (email: string, password: string) => {
    const nextErrors: FieldErrors = {};

    if (!email.trim()) {
      nextErrors.email = "Informe seu email.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = "Informe um email válido.";
    }

    if (!password.trim()) {
      nextErrors.password = "Informe sua senha.";
    }

    return nextErrors;
  };

  const clearFieldError = (field: keyof FieldErrors) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      return { ...prev, [field]: undefined };
    });
  };

  const resolveCallbackPath = (url?: string | null) => {
    if (!url) return "/dashboard";
    try {
      const parsed = new URL(url);
      return `${parsed.pathname}${parsed.search}${parsed.hash}` || "/dashboard";
    } catch {
      return url.startsWith("/") ? url : "/dashboard";
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    // Processa o login via credenciais e redireciona para o painel.
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));

    const validationErrors = validateFields(email, password);
    setFieldErrors(validationErrors);
    if (validationErrors.email || validationErrors.password) {
      return;
    }

    const result = await signIn("credentials", {
      redirect: false,
      callbackUrl: "/dashboard",
      email,
      password
    });

    if (result?.error) {
      // Exibe erro caso as credenciais estejam invalidas.
      setError("Credenciais inválidas.");
      return;
    }

    router.push(resolveCallbackPath(result?.url));
    router.refresh();
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-10">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="bg-white border border-slate-200 rounded-lg p-6 w-full max-w-md space-y-4"
      >
        <h1 className="text-xl font-semibold">Acesso ao portal</h1>
        {sessionDerrubada && (
          <p role="status" aria-live="polite" className="text-sm rounded border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2">
            Sua sessão foi encerrada por um administrador. Entre novamente para continuar.
          </p>
        )}
        <div>
          <label htmlFor="email" className="block text-sm font-medium">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
            onChange={() => clearFieldError("email")}
            className="w-full border rounded px-3 py-2"
          />
          {fieldErrors.email && (
            <p id="email-error" className="mt-1 text-sm text-red-600">
              {fieldErrors.email}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium">Senha</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? "password-error" : undefined}
            onChange={() => clearFieldError("password")}
            className="w-full border rounded px-3 py-2"
          />
          {fieldErrors.password && (
            <p id="password-error" className="mt-1 text-sm text-red-600">
              {fieldErrors.password}
            </p>
          )}
        </div>
        <button type="submit" className="w-full px-4 py-2 rounded bg-brand-600 text-white text-sm">
          Entrar
        </button>
        {error && (
          <p role="alert" aria-live="polite" className="text-sm text-red-600">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
