import Link from "next/link";
import { db } from "@/lib/db";
import { extractFirstImageSrcFromHtml } from "@/lib/content-url";
import { toPublicUrl } from "@/lib/uploads-url";
import { PublicPageHero } from "@/components/public-page-hero";
import { createPublicMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = createPublicMetadata({
  title: "Eventos",
  description: "Calendário de reuniões, atividades e datas importantes da Escola Municipal Getúlio Vargas.",
  path: "/eventos"
});

export default async function EventosPage() {
  // Lista apenas eventos publicados, ordenados pela data de inicio.
  const eventos = await db.evento.findMany({
    where: { status: "PUBLICADO" },
    orderBy: [{ ordem: "asc" }, { dataInicio: "asc" }]
  });
  const agora = new Date();
  const proximos = eventos.filter((evento) => evento.dataInicio >= agora).length;

  return (
    <div>
      <PublicPageHero
        eyebrow="Calendário escolar"
        title="Eventos"
        description="Acompanhe reuniões, atividades e datas importantes da escola."
        icon="calendar"
        stats={[
          { value: eventos.length, label: "evento(s)", hint: "publicado(s) no calendário" },
          { value: proximos, label: "próximo(s)", hint: "com data futura" }
        ]}
      />

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {eventos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            Não há eventos publicados no momento.
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {eventos.map((evento) => {
              const imagemEvento = extractFirstImageSrcFromHtml(evento.conteudo);
              return (
                <Link
                  key={evento.id}
                  href={`/eventos/${evento.id}`}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md sm:flex-row dark:border-slate-800 dark:bg-slate-900"
                >
                  {imagemEvento ? (
                    <div className="relative h-40 w-full shrink-0 overflow-hidden bg-slate-100 sm:h-auto sm:min-h-44 sm:w-48 lg:w-52 dark:bg-slate-800">
                      <img
                        src={toPublicUrl(imagemEvento)}
                        alt={evento.titulo}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="flex h-40 w-full shrink-0 items-center justify-center bg-brand-50 sm:h-auto sm:min-h-44 sm:w-48 lg:w-52 dark:bg-brand-900/30">
                      <div className="flex h-20 w-20 flex-col items-center justify-center rounded-xl bg-white shadow-sm dark:bg-slate-900">
                        <span className="text-3xl font-bold text-brand-700 dark:text-brand-300">
                          {new Date(evento.dataInicio).getDate()}
                        </span>
                        <span className="text-xs uppercase text-brand-700 dark:text-brand-300">
                          {new Date(evento.dataInicio).toLocaleDateString("pt-BR", { month: "short" })}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-5">
                    <h2 className="line-clamp-2 font-semibold text-slate-900 group-hover:text-brand-700 dark:text-slate-100 dark:group-hover:text-brand-300">
                      {evento.titulo}
                    </h2>
                    <p className="mt-2 line-clamp-3 text-sm text-slate-600 dark:text-slate-300">{evento.descricao}</p>
                    <div className="mt-auto space-y-1 pt-4 text-xs text-slate-500 dark:text-slate-400">
                      <p>
                        {new Date(evento.dataInicio).toLocaleDateString("pt-BR", {
                          dateStyle: "medium"
                        })}
                        {" - "}
                        {new Date(evento.dataInicio).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </p>
                      <p>{evento.local}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
