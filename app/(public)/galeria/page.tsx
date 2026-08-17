import Link from "next/link";
import { PublicPageHero } from "@/components/public-page-hero";
import { parsePublicTexts } from "@/lib/public-texts";
import { getPublicTextsJson } from "@/lib/public-texts-config";
import { createPublicMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = createPublicMetadata({
  title: "Galeria",
  description: "Fotos, vídeos e registros de atividades, projetos e momentos da Escola Municipal Getúlio Vargas.",
  path: "/galeria"
});

export default async function GaleriaPublicaPage() {
  const textos = parsePublicTexts(await getPublicTextsJson());

  return (
    <main className="bg-slate-50 dark:bg-slate-950">
      <PublicPageHero
        eyebrow={textos.galeria.eyebrow}
        title={textos.galeria.title}
        description={textos.galeria.description}
        icon="gallery"
        contentCard
        aside={
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <GalleryShortcut href="/galeria/fotos" title="Fotos" description="Álbuns e registros" tone="brand" />
            <GalleryShortcut href="/galeria/videos" title="Vídeos" description="Momentos em movimento" tone="emerald" />
          </div>
        }
      />

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-5 md:grid-cols-2">
          <GalleryCard
            href="/galeria/fotos"
            title="Galeria de fotos"
            description="Veja os principais registros fotográficos das atividades, projetos, eventos e momentos da comunidade escolar."
            action="Ver fotos"
            icon="photo"
            tone="brand"
          />
          <GalleryCard
            href="/galeria/videos"
            title="Galeria de vídeos"
            description="Assista aos vídeos publicados pela escola e acesse uploads de áudio e vídeo reunidos em um só lugar."
            action="Ver vídeos"
            icon="video"
            tone="emerald"
          />
        </div>
      </section>
    </main>
  );
}

function GalleryShortcut({
  href,
  title,
  description,
  tone
}: {
  href: string;
  title: string;
  description: string;
  tone: "brand" | "emerald";
}) {
  const classes =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
      : "border-brand-200 bg-brand-50 text-brand-800 hover:bg-brand-100 dark:border-brand-900 dark:bg-brand-900/30 dark:text-brand-200";

  return (
    <Link
      href={href}
      className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${classes}`}
    >
      <p className="text-2xl font-bold">{title}</p>
      <p className="mt-1 text-sm opacity-80">{description}</p>
    </Link>
  );
}

function GalleryCard({
  href,
  title,
  description,
  action,
  icon,
  tone
}: {
  href: string;
  title: string;
  description: string;
  action: string;
  icon: "photo" | "video";
  tone: "brand" | "emerald";
}) {
  const color =
    tone === "emerald"
      ? "bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300"
      : "bg-brand-100 text-brand-700 group-hover:bg-brand-600 dark:bg-brand-900/50 dark:text-brand-300";
  const accent = tone === "emerald" ? "text-emerald-700 dark:text-emerald-300" : "text-brand-700 dark:text-brand-300";
  const hover = tone === "emerald" ? "group-hover:bg-emerald-600" : "group-hover:bg-brand-600";

  return (
    <Link
      href={href}
      className="group flex min-h-60 flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-900 dark:focus-visible:ring-offset-slate-950"
    >
      <div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl transition-colors group-hover:text-white ${color}`}>
          {icon === "photo" ? (
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7a2 2 0 012-2h2l1.2-1.6A1 1 0 0110 3h4a1 1 0 01.8.4L16 5h2a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12a3 3 0 106 0 3 3 0 00-6 0z" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.6-2.3A1 1 0 0121 8.6v6.8a1 1 0 01-1.4.9L15 14v-4z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 6h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
            </svg>
          )}
        </div>
        <h2 className="mt-5 text-2xl font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
      </div>
      <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
        <span className={`text-sm font-semibold ${accent}`}>{action}</span>
        <span className={`flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition group-hover:text-white dark:bg-slate-800 dark:text-slate-200 ${hover}`}>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </Link>
  );
}
