import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { rewriteUploadUrlsInHtml } from "@/lib/content-url";
import { toPublicUrl } from "@/lib/uploads-url";
import { PublicPageHero } from "@/components/public-page-hero";
import { createPublicMetadata, stripHtmlToText } from "@/lib/seo";
import {
  getNewsCoverFrameClass,
  getNewsCoverImageClass,
  getNewsCoverOuterClass,
  normalizeNewsCoverSize
} from "@/lib/news-cover-size";

export const dynamic = "force-dynamic";

const DEFAULT_NEWS_COVER = "/noticias/capa-padrao.svg";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const noticia = await db.noticia.findUnique({
    where: { slug: params.slug },
    select: { titulo: true, resumo: true, conteudo: true, imagemCapa: true }
  });

  if (!noticia) {
    return createPublicMetadata({
      title: "Notícia não encontrada",
      description: "A notícia solicitada não foi encontrada.",
      path: `/noticias/${params.slug}`
    });
  }

  return createPublicMetadata({
    title: noticia.titulo,
    description: noticia.resumo || stripHtmlToText(noticia.conteudo),
    path: `/noticias/${params.slug}`,
    image: noticia.imagemCapa ? toPublicUrl(noticia.imagemCapa) : null,
    type: "article"
  });
}

export default async function NoticiaDetalhe({ params }: { params: { slug: string } }) {
  // Busca a noticia pelo slug para exibir o conteudo completo.
  const noticia = await db.noticia.findUnique({
    where: { slug: params.slug }
  });
  if (!noticia) return notFound();
  const conteudoNormalizado = rewriteUploadUrlsInHtml(noticia.conteudo);
  const dataPublicacao = noticia.dataPublicacao
    ? new Date(noticia.dataPublicacao).toLocaleDateString("pt-BR")
    : "Data não informada";

  const coverSize = normalizeNewsCoverSize(noticia.imagemCapaTamanho);

  return (
    <div>
      <PublicPageHero
        eyebrow="Notícia"
        title={noticia.titulo}
        description={noticia.resumo}
        icon="news"
        backLink={{ href: "/noticias", label: "Voltar para notícias" }}
        stats={[{ value: dataPublicacao, label: "publicação" }]}
      />

      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className={`${getNewsCoverOuterClass(coverSize)} overflow-hidden rounded-3xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-3`}>
          {noticia.imagemCapa ? (
            <figure className={getNewsCoverFrameClass(coverSize)}>
              <img
                src={toPublicUrl(noticia.imagemCapa)}
                alt={noticia.titulo}
                loading="eager"
                decoding="async"
                fetchPriority="high"
                className={getNewsCoverImageClass(coverSize)}
              />
            </figure>
          ) : (
            <div
              className="relative flex min-h-52 w-full items-end overflow-hidden rounded-2xl bg-cover bg-center p-5 sm:min-h-64"
              style={{ backgroundImage: `url(${DEFAULT_NEWS_COVER})` }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/20 to-transparent" />
              <h2 className="relative max-w-3xl text-2xl font-bold leading-tight text-white md:text-3xl">
                {noticia.titulo}
              </h2>
            </div>
          )}
        </div>

        <article
          className="article-content prose prose-slate mt-6 max-w-none rounded-2xl border border-slate-200 bg-white px-6 py-7 shadow-sm dark:prose-invert dark:border-slate-800 dark:bg-slate-900"
          dangerouslySetInnerHTML={{ __html: conteudoNormalizado }}
        />
      </section>
    </div>
  );
}
