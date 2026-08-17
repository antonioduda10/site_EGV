import Link from "next/link";
import { db } from "@/lib/db";
import { toPublicUrl } from "@/lib/uploads-url";
import { parsePublicTexts } from "@/lib/public-texts";
import { getPublicTextsJson } from "@/lib/public-texts-config";
import { PublicPageHero } from "@/components/public-page-hero";
import { createPublicMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

const DEFAULT_NEWS_COVER = "/noticias/capa-padrao.svg";

export const metadata = createPublicMetadata({
  title: "Notícias",
  description: "Informações, avisos e atualizações da Escola Municipal Getúlio Vargas.",
  path: "/noticias"
});

export default async function NoticiasPage({
  searchParams
}: {
  searchParams: { q?: string };
}) {
  const query = searchParams.q?.trim();
  // Lista apenas noticias publicadas e aplica busca opcional.
  const [noticias, textosPublicosJson] = await Promise.all([
    db.noticia.findMany({
      where: {
        status: "PUBLICADO",
        OR: query
          ? [
              { titulo: { contains: query, mode: "insensitive" } },
              { resumo: { contains: query, mode: "insensitive" } }
            ]
          : undefined
      },
      orderBy: { dataPublicacao: "desc" }
    }),
    getPublicTextsJson()
  ]);
  const textos = parsePublicTexts(textosPublicosJson);

  return (
    <div>
      <PublicPageHero
        eyebrow="Comunicação escolar"
        title={textos.noticias.title}
        description={textos.noticias.description}
        icon="news"
        stats={[
          {
            value: noticias.length,
            label: "notícia(s)",
            hint: query ? "resultado(s) para a busca atual" : "publicada(s) no portal"
          }
        ]}
      />
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <form className="mt-6 flex flex-col gap-2 md:flex-row" role="search" aria-label="Buscar notícias">
        <input
          name="q"
          placeholder="Buscar notícias"
          defaultValue={query}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm md:w-96 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Buscar
        </button>
      </form>
      {noticias.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          Nenhuma notícia encontrada para este filtro.
        </div>
      ) : (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {noticias.map((noticia) => (
            <Link
              key={noticia.id}
              href={`/noticias/${noticia.slug}`}
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md sm:flex-row dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="relative h-40 w-full shrink-0 overflow-hidden bg-slate-100 sm:h-auto sm:min-h-44 sm:w-48 lg:w-52 dark:bg-slate-800">
                {noticia.imagemCapa ? (
                  <img
                    src={toPublicUrl(noticia.imagemCapa)}
                    alt={noticia.titulo}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div
                    className="relative flex h-full w-full items-end bg-cover bg-center p-4"
                    style={{ backgroundImage: `url(${DEFAULT_NEWS_COVER})` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-900/25 to-transparent" />
                    <p className="relative line-clamp-2 text-sm font-semibold text-white drop-shadow">
                      {noticia.titulo}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h2 className="line-clamp-2 font-semibold text-slate-900 group-hover:text-brand-700 dark:text-slate-100 dark:group-hover:text-brand-300">
                  {noticia.titulo}
                </h2>
                <p className="mt-2 line-clamp-3 text-sm text-slate-600 dark:text-slate-300">{noticia.resumo}</p>
                <p className="mt-auto pt-4 text-xs text-slate-500 dark:text-slate-400">
                  {noticia.dataPublicacao
                    ? new Date(noticia.dataPublicacao).toLocaleDateString("pt-BR")
                    : "Data não informada"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
      </section>
    </div>
  );
}
