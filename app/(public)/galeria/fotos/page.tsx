import { db } from "@/lib/db";
import { toPublicUrl } from "@/lib/uploads-url";
import { PublicPageHero } from "@/components/public-page-hero";
import { createPublicMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = createPublicMetadata({
  title: "Galeria de fotos",
  description: "Álbuns e registros fotográficos da Escola Municipal Getúlio Vargas.",
  path: "/galeria/fotos"
});

export default async function GaleriaFotosPublicaPage() {
  const albuns = await db.albumFoto.findMany({
    orderBy: [{ ordem: "asc" }, { dataCriacao: "desc" }],
    include: {
      capaMidia: true,
      midias: {
        where: { tipo: { startsWith: "image/" } },
        orderBy: [{ ordem: "asc" }, { dataUpload: "desc" }]
      }
    }
  });

  const imagensSemAlbum = await db.midia.findMany({
    where: { tipo: { startsWith: "image/" }, albumId: null },
    orderBy: [{ ordem: "asc" }, { dataUpload: "desc" }]
  });

  const albunsComFotos = albuns.filter((album) => album.midias.length > 0);
  const totalFotos = albunsComFotos.reduce((total, album) => total + album.midias.length, 0) + imagensSemAlbum.length;
  const possuiConteudo = totalFotos > 0;

  return (
    <main className="bg-slate-50 dark:bg-slate-950">
      <PublicPageHero
        eyebrow="Registros em imagem"
        title="Galeria de fotos"
        description="Veja momentos, atividades, projetos e eventos registrados pela Escola Municipal Getúlio Vargas."
        icon="photo"
        contentCard
        backLink={{ href: "/galeria", label: "Voltar para galeria" }}
        stats={[
          { value: albunsComFotos.length, label: "álbum(ns)", hint: "com fotos publicadas" },
          { value: totalFotos, label: "foto(s)", hint: "disponível(is)" }
        ]}
      />

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {!possuiConteudo ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            Nenhuma foto publicada ainda.
          </div>
        ) : (
          <div className="space-y-5">
            {albunsComFotos.map((album) => {
              const capa = album.capaMidia?.tipo.startsWith("image/") ? album.capaMidia.caminho : album.midias[0].caminho;

              return (
                <details key={album.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <summary className="list-none cursor-pointer p-4 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset dark:hover:bg-slate-800/60">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <img
                        src={toPublicUrl(capa)}
                        alt={`Capa do álbum ${album.nome}`}
                        loading="lazy"
                        decoding="async"
                        className="h-40 w-full rounded-xl border border-slate-200 object-cover sm:h-28 sm:w-40 dark:border-slate-700"
                      />
                      <div className="min-w-0 flex-1">
                        <h2 className="inline-flex max-w-full rounded-xl bg-slate-100 px-3 py-2 text-xl font-semibold text-slate-900 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700">
                          <span className="truncate">{album.nome}</span>
                        </h2>
                        {album.descricao && <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{album.descricao}</p>}
                        <CounterBadge value={album.midias.length} label="foto(s)" />
                      </div>
                      <span className="inline-flex items-center justify-center rounded-full border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 group-open:hidden dark:border-brand-800 dark:text-brand-300">
                        Abrir álbum
                      </span>
                      <span className="hidden items-center justify-center rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 group-open:inline-flex dark:border-slate-700 dark:text-slate-300">
                        Fechar álbum
                      </span>
                    </div>
                  </summary>
                  <div className="border-t border-slate-100 p-4 dark:border-slate-800">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {album.midias.map((midia) => (
                        <PhotoFigure key={midia.id} midia={midia} />
                      ))}
                    </div>
                  </div>
                </details>
              );
            })}

            {imagensSemAlbum.length > 0 && (
              <details className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <summary className="list-none cursor-pointer p-5 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset dark:hover:bg-slate-800/60">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="inline-flex rounded-xl bg-slate-100 px-3 py-2 text-xl font-semibold text-slate-900 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700">
                        Fotos sem álbum
                      </h2>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Registros publicados individualmente.</p>
                      <CounterBadge value={imagensSemAlbum.length} label="foto(s)" />
                    </div>
                    <span className="text-xs font-semibold text-brand-700 group-open:hidden dark:text-brand-300">Abrir fotos</span>
                    <span className="hidden text-xs font-semibold text-slate-600 group-open:inline dark:text-slate-300">Fechar fotos</span>
                  </div>
                </summary>
                <div className="border-t border-slate-100 p-4 dark:border-slate-800">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {imagensSemAlbum.map((midia) => (
                      <PhotoFigure key={midia.id} midia={midia} />
                    ))}
                  </div>
                </div>
              </details>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

type PhotoFigureProps = {
  midia: {
    id: string;
    titulo: string;
    descricao: string | null;
    caminho: string;
    dataReferencia: Date | null;
    dataUpload: Date;
  };
};

function PhotoFigure({ midia }: PhotoFigureProps) {
  return (
    <figure className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-950">
      <img
        src={toPublicUrl(midia.caminho)}
        alt={midia.titulo}
        loading="lazy"
        decoding="async"
        className="h-56 w-full object-cover"
      />
      <figcaption className="space-y-1 p-4">
        <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700">
          {midia.titulo}
        </p>
        {midia.descricao && <p className="line-clamp-2 text-xs text-slate-600 dark:text-slate-300">{midia.descricao}</p>}
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {midia.dataReferencia
            ? new Date(midia.dataReferencia).toLocaleDateString("pt-BR", { timeZone: "UTC" })
            : new Date(midia.dataUpload).toLocaleDateString("pt-BR")}
        </p>
      </figcaption>
    </figure>
  );
}

function CounterBadge({ value, label }: { value: number; label: string }) {
  return (
    <span className="mt-3 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 shadow-sm dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-200">
      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] text-white dark:bg-brand-500">
        {value}
      </span>
      {label}
    </span>
  );
}
