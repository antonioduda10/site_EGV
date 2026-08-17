import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { rewriteUploadUrlsInHtml } from "@/lib/content-url";
import { parsePublicTexts } from "@/lib/public-texts";
import { getPublicTextsJson } from "@/lib/public-texts-config";
import { PublicPageHero } from "@/components/public-page-hero";
import { createPublicMetadata, stripHtmlToText } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const pagina = await db.paginaInstitucional.findFirst({
    where: { slug: params.slug, visivel: true },
    select: { titulo: true, conteudo: true }
  });

  if (!pagina) {
    return createPublicMetadata({
      title: "Página não encontrada",
      description: "A página institucional solicitada não foi encontrada.",
      path: `/p/${params.slug}`
    });
  }

  return createPublicMetadata({
    title: pagina.titulo,
    description: stripHtmlToText(pagina.conteudo),
    path: `/p/${params.slug}`
  });
}

export default async function PaginaInstitucional({ params }: { params: { slug: string } }) {
  // Busca somente paginas publicas e visiveis pelo slug.
  const [pagina, textosPublicosJson] = await Promise.all([
    db.paginaInstitucional.findFirst({
      where: { slug: params.slug, visivel: true }
    }),
    getPublicTextsJson()
  ]);
  if (!pagina) return notFound();
  const textos = parsePublicTexts(textosPublicosJson);
  const conteudoNormalizado = rewriteUploadUrlsInHtml(pagina.conteudo);
  const resumo = stripHtml(pagina.conteudo);

  return (
    <div className="bg-slate-50 dark:bg-slate-950">
      <PublicPageHero
        eyebrow="Página institucional"
        title={pagina.titulo}
        description={resumo}
        icon="school"
        backLink={{ href: "/", label: "Voltar para início" }}
        aside={
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              {textos.institucional.label}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
              {textos.institucional.description}
            </p>
            <div className="mt-4 rounded-2xl bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-800 ring-1 ring-brand-100 dark:bg-brand-900/30 dark:text-brand-200 dark:ring-brand-800/70">
              /p/{pagina.slug}
            </div>
          </div>
        }
      />

      <section className="mx-auto max-w-5xl px-4 py-10 sm:py-12">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8 md:p-10">
          {/* Renderiza o HTML salvo no banco (conteudo da pagina). */}
          <article
            className="article-content prose prose-slate max-w-none dark:prose-invert prose-headings:scroll-mt-28 prose-headings:text-slate-950 dark:prose-headings:text-white prose-a:font-semibold"
            dangerouslySetInnerHTML={{ __html: conteudoNormalizado }}
          />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-brand-500/40 dark:hover:bg-brand-900/30 dark:hover:text-brand-200"
          >
            Voltar para a página inicial
          </Link>
          <Link
            href="/contato"
            className="inline-flex min-h-11 items-center rounded-2xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-400"
          >
            Falar com a escola
          </Link>
        </div>
      </section>
    </div>
  );
}

function stripHtml(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}
