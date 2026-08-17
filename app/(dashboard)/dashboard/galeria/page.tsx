import { DashboardTopbar } from "@/components/dashboard/topbar";
import Link from "next/link";

export default async function GaleriaPage() {
  // Atalhos para cada tipo de galeria no painel.
  return (
    <div>
      <DashboardTopbar title="Galeria" />
      <div className="p-6 grid gap-4 md:grid-cols-2">
        <Link
          href="/dashboard/galeria/fotos"
          className="bg-white border border-slate-200 rounded-lg p-6 hover:border-brand-300 transition"
        >
          <h2 className="text-lg font-semibold">Galeria de fotos</h2>
          <p className="text-sm text-slate-600 mt-2">Gerencie uploads e títulos das fotos.</p>
        </Link>
        <Link
          href="/dashboard/galeria/videos"
          className="bg-white border border-slate-200 rounded-lg p-6 hover:border-brand-300 transition"
        >
          <h2 className="text-lg font-semibold">Galeria de vídeos</h2>
          <p className="text-sm text-slate-600 mt-2">Cadastre vídeos por URL e envie áudio/vídeo.</p>
        </Link>
      </div>
    </div>
  );
}
