import { db } from "@/lib/db";
import { VideoGallery } from "@/components/video-gallery";
import { toPublicUrl } from "@/lib/uploads-url";
import { PublicPageHero } from "@/components/public-page-hero";
import { createPublicMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = createPublicMetadata({
  title: "Galeria de vídeos",
  description: "Vídeos, áudios e mídias publicadas pela Escola Municipal Getúlio Vargas.",
  path: "/galeria/videos"
});

export default async function GaleriaVideosPublicaPage() {
  const [videos, uploads] = await Promise.all([
    db.videoGaleria.findMany({ orderBy: { dataPublicacao: "desc" } }),
    db.midia.findMany({
      where: {
        OR: [{ tipo: { startsWith: "audio/" } }, { tipo: { startsWith: "video/" } }]
      },
      orderBy: { dataUpload: "desc" }
    })
  ]);

  const audios = uploads.filter((midia) => midia.tipo.startsWith("audio/"));
  const videosUpload = uploads.filter((midia) => midia.tipo.startsWith("video/"));
  const totalMidias = videos.length + videosUpload.length + audios.length;

  return (
    <main className="bg-slate-50 dark:bg-slate-950">
      <PublicPageHero
        eyebrow="Vídeos e áudios"
        title="Galeria de vídeos"
        description="Assista aos vídeos publicados pela escola e acesse arquivos de áudio e vídeo enviados pela equipe."
        icon="video"
        tone="emerald"
        contentCard
        backLink={{ href: "/galeria", label: "Voltar para galeria" }}
        stats={[
          { value: videos.length, label: "links", hint: "publicados" },
          { value: videosUpload.length, label: "vídeo(s)", hint: "enviado(s)" },
          { value: audios.length, label: "áudio(s)", hint: "disponível(is)" }
        ]}
      />

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {totalMidias === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            Nenhum vídeo publicado ainda.
          </div>
        ) : (
          <div className="grid gap-8">
            {videos.length > 0 && (
              <section className="space-y-4">
                <SectionTitle
                  title="Vídeos por link"
                  description="Publicações incorporadas ou abertas em uma nova aba quando necessário."
                  count={videos.length}
                  countLabel="link(s)"
                />
                <VideoGallery videos={videos} />
              </section>
            )}

            {videosUpload.length > 0 && (
              <section className="space-y-4">
                <SectionTitle
                  title="Vídeos enviados"
                  description="Arquivos de vídeo enviados diretamente para a galeria da escola."
                  count={videosUpload.length}
                  countLabel="vídeo(s)"
                />
                <div className="grid gap-5 md:grid-cols-2">
                  {videosUpload.map((midia) => (
                    <figure key={midia.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                      <div className="aspect-video bg-slate-950">
                        <video controls preload="metadata" className="h-full w-full">
                          <source src={toPublicUrl(midia.caminho)} type={midia.tipo} />
                        </video>
                      </div>
                      <figcaption className="space-y-1 p-4">
                        <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700">
                          {midia.titulo}
                        </p>
                        {midia.descricao && <p className="line-clamp-2 text-xs text-slate-600 dark:text-slate-300">{midia.descricao}</p>}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </section>
            )}

            {audios.length > 0 && (
              <section className="space-y-4">
                <SectionTitle
                  title="Áudios enviados"
                  description="Registros sonoros e arquivos de áudio publicados pela escola."
                  count={audios.length}
                  countLabel="áudio(s)"
                />
                <div className="grid gap-5 sm:grid-cols-2">
                  {audios.map((midia) => (
                    <figure key={midia.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                      <figcaption className="mb-4">
                        <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700">
                          {midia.titulo}
                        </p>
                        {midia.descricao && <p className="mt-1 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">{midia.descricao}</p>}
                      </figcaption>
                      <audio controls preload="metadata" className="w-full">
                        <source src={toPublicUrl(midia.caminho)} type={midia.tipo} />
                      </audio>
                    </figure>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

function SectionTitle({
  title,
  description,
  count,
  countLabel
}: {
  title: string;
  description: string;
  count: number;
  countLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex sm:items-center sm:justify-between sm:gap-4">
      <div>
        <h2 className="inline-flex rounded-xl bg-emerald-50 px-3 py-2 text-2xl font-semibold text-emerald-900 ring-1 ring-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-100 dark:ring-emerald-900">
          {title}
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{description}</p>
      </div>
      <span className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200 sm:mt-0">
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[11px] text-white dark:bg-emerald-500">
          {count}
        </span>
        {countLabel}
      </span>
    </div>
  );
}
