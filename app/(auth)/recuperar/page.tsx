import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/forms/reset-password-form";

export default function RecuperarSenhaPage() {
  return <div className="flex min-h-[70vh] items-center justify-center px-4 py-10"><Suspense fallback={<p>Carregando formulário...</p>}><ResetPasswordForm /></Suspense></div>;
}
