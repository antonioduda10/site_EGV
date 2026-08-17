import Link from "next/link";
import { db } from "@/lib/db";
import { BannerCarousel } from "@/components/banner-carousel";
import { toPublicUrl } from "@/lib/uploads-url";
import { extractFirstImageSrcFromHtml } from "@/lib/content-url";
import { parsePublicTexts } from "@/lib/public-texts";
import { getPublicTextsJson } from "@/lib/public-texts-config";
import { parseHomeAlerts, parseHomeDisplaySettings } from "@/lib/home-alerts";
import { getHomeAlertsJson } from "@/lib/home-alerts-config";
import { createPublicMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

const DEFAULT_NEWS_COVER = "/noticias/capa-padrao.svg";

export const metadata = createPublicMetadata({
  title: "Portal EGV",
  description: "Portal institucional da Escola Municipal Getúlio Vargas para notícias, eventos, documentos e atendimento à comunidade escolar.",
  path: "/"
});

export default async function HomePage() {
  // Carrega configuracoes e dados dinamicos da pagina inicial.
  const [config, textosPublicosJson, avisosHomeJson, banners, noticias, eventos] = await Promise.all([
    db.configuracaoSite.findFirst({
      select: {
        acessoRapidoJson: true,
        botaoHistoriaLink: true,
        botaoHistoriaNovaAba: true
      }
    }).catch(() => null),
    getPublicTextsJson(),
    getHomeAlertsJson(),
    db.banner.findMany({
      where: { ativo: true },
      orderBy: { ordem: "asc" }
    }).catch(() => []),
    db.noticia.findMany({
      where: { status: "PUBLICADO" },
      orderBy: { dataPublicacao: "desc" },
      take: 3
    }).catch(() => []),
    db.evento.findMany({
      where: { status: "PUBLICADO" },
      orderBy: [{ ordem: "asc" }, { dataInicio: "asc" }],
      take: 3
    }).catch(() => [])
  ]);
  const acessoRapido = config?.acessoRapidoJson ? safeParse(config.acessoRapidoJson) : null;
  const textos = parsePublicTexts(textosPublicosJson);
  const avisos = parseHomeAlerts(avisosHomeJson).filter((aviso) => aviso.ativo !== false);
  const homeDisplaySettings = parseHomeDisplaySettings(avisosHomeJson);
  const historiaLink = config?.botaoHistoriaLink || "/p/escola";
  const historiaNovaAba = Boolean(config?.botaoHistoriaNovaAba);
  const alertAnimationClass = homeDisplaySettings.alertAnimationEnabled
    ? `home-alert-highlight home-alert-highlight--${homeDisplaySettings.alertAnimationSpeed}`
    : "";

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-4 md:py-8">
      {/* Carousel de banners */}
      <BannerCarousel banners={banners} intervalMs={homeDisplaySettings.bannerIntervalMs} />

      {/* Seção de apresentação e acessos rápidos */}
      <section className="grid items-stretch gap-5 md:grid-cols-12">
        <div className="flex h-full flex-col justify-center rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:col-span-7 md:p-8 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700 dark:text-brand-300">
            {textos.home.eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-slate-900 md:text-4xl dark:text-slate-100">
            {textos.home.title}
          </h1>
          <p className="mt-4 max-w-2xl text-slate-600 dark:text-slate-300">
            {textos.home.description}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/noticias"
              className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              Ver Notícias
            </Link>
            <Link
              href={historiaLink}
              target={historiaNovaAba ? "_blank" : undefined}
              rel={historiaNovaAba ? "noreferrer" : undefined}
              className="rounded-lg border border-brand-600 px-5 py-2.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-900/30"
            >
              Nossa História
            </Link>
          </div>
        </div>

        {/* Card de acessos rápidos */}
        <div className="h-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center gap-2">
            <svg
              className="h-5 w-5 text-brand-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Acesso Rápido</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 md:max-h-[280px] md:grid-cols-1 md:overflow-y-auto md:pr-1 xl:grid-cols-2">
            {(Array.isArray(acessoRapido) ? acessoRapido : defaultAcessoRapido).map((item, index) => {
              const isExternal = item.href.startsWith("http://") || item.href.startsWith("https://");
              const shouldOpenInNewTab = Boolean(item.newTab ?? isExternal);
              const Card = (
                <div className="group flex h-full items-center gap-3 rounded-lg border border-slate-200/80 p-3 transition-colors hover:border-brand-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-100 transition-colors group-hover:bg-brand-200">
                    <svg className="h-[22px] w-[22px] text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{item.label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.descricao}</p>
                  </div>
                </div>
              );

              return isExternal ? (
                <a
                  key={`${item.href}-${index}`}
                  href={item.href}
                  target={shouldOpenInNewTab ? "_blank" : undefined}
                  rel={shouldOpenInNewTab ? "noreferrer" : undefined}
                >
                  {Card}
                </a>
              ) : (
                <Link
                  key={`${item.href}-${index}`}
                  href={item.href}
                  target={shouldOpenInNewTab ? "_blank" : undefined}
                  rel={shouldOpenInNewTab ? "noreferrer" : undefined}
                >
                  {Card}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {avisos.length > 0 && (
        <section className="max-w-full overflow-hidden rounded-3xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-4 shadow-lg shadow-amber-100/70 dark:border-amber-500/50 dark:from-amber-950/30 dark:via-slate-950 dark:to-slate-900 dark:shadow-black/20 sm:p-6">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">
                Comunicação prioritária
              </p>
              <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">Avisos importantes</h2>
            </div>
            <span className="inline-flex w-fit items-center rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 shadow-sm dark:border-amber-700 dark:bg-amber-900/50 dark:text-amber-100">
              <span className="home-alert-dot mr-2 h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />
              {avisos.length} aviso(s)
            </span>
          </div>

          <div className={`grid min-w-0 gap-4 ${avisos.length > 1 ? "lg:grid-cols-2" : ""}`}>
            {avisos.map((aviso, index) => {
              const href = aviso.href?.trim();
              const imagem = toPublicUrl(aviso.imagemUrl);
              const isExternal = Boolean(href?.startsWith("http://") || href?.startsWith("https://"));
              const content = (
                <article
                  className={`${alertAnimationClass} h-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-amber-300 bg-white shadow-md shadow-amber-100/60 ring-1 ring-amber-200/70 transition hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-lg dark:border-amber-700/70 dark:bg-slate-900 dark:shadow-black/20 dark:ring-amber-800/50 ${
                    imagem ? "sm:grid sm:grid-cols-[168px_1fr] lg:grid-cols-[190px_1fr]" : ""
                  }`}
                >
                  {imagem && (
                    <div
                      className="h-28 w-full max-w-full overflow-hidden border-b border-amber-200 bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/50 sm:h-full sm:min-h-[168px] sm:border-b-0 sm:border-r lg:min-h-[180px]"
                    >
                      <img
                        src={imagem}
                        alt={aviso.titulo || "Imagem do aviso importante"}
                        loading="lazy"
                        decoding="async"
                        className="block h-full w-full max-w-full object-cover object-top"
                      />
                    </div>
                  )}
                  <div className="min-w-0 p-5 sm:p-6">
                    <p className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-800 dark:bg-amber-900/50 dark:text-amber-100">
                      Destaque
                    </p>
                    <h3 className="mt-2 break-words font-semibold text-slate-950 dark:text-white">{aviso.titulo}</h3>
                    {aviso.descricao && <p className="mt-2 break-words text-sm leading-6 text-slate-600 dark:text-slate-300">{aviso.descricao}</p>}
                    {(href || imagem) && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {href &&
                          (isExternal ? (
                            <a
                              href={href}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex min-h-9 items-center rounded-xl bg-amber-600 px-3 text-xs font-semibold text-white transition hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 dark:focus-visible:ring-offset-slate-900"
                            >
                              Ver detalhes
                            </a>
                          ) : (
                            <Link
                              href={href}
                              className="inline-flex min-h-9 items-center rounded-xl bg-amber-600 px-3 text-xs font-semibold text-white transition hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 dark:focus-visible:ring-offset-slate-900"
                            >
                              Ver detalhes
                            </Link>
                          ))}
                        {imagem && (
                          <a
                            href={imagem}
                            download
                            className="inline-flex min-h-9 items-center rounded-xl border border-amber-200 bg-white px-3 text-xs font-semibold text-amber-700 transition hover:border-amber-300 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:border-amber-800 dark:bg-slate-950 dark:text-amber-200 dark:hover:bg-amber-950/40 dark:focus-visible:ring-offset-slate-900"
                          >
                            Baixar imagem
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );

              return <div key={`aviso-${index}`}>{content}</div>;
            })}
          </div>
        </section>
      )}

      {/* Ultimas noticias com resumo e link para detalhes */}
      <section className="rounded-3xl bg-slate-50/80 p-4 sm:p-6 dark:bg-slate-950/30">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{textos.home.newsTitle}</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{textos.home.newsDescription}</p>
          </div>
          <Link
            href="/noticias"
            className="flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800 dark:text-brand-300"
          >
            Ver todas
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
        {noticias.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            Ainda não há notícias publicadas.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {noticias.map((noticia) => (
              <Link
                key={noticia.id}
                href={`/noticias/${noticia.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="relative h-32 w-full overflow-hidden bg-slate-100 sm:h-36 lg:h-32 xl:h-36 dark:bg-slate-800">
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
                  <h3 className="line-clamp-2 font-semibold text-slate-900 transition-colors group-hover:text-brand-700 dark:text-slate-100 dark:group-hover:text-brand-300">
                    {noticia.titulo}
                  </h3>
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

      {/* Proximos eventos ordenados pela data */}
      <section className="pb-1">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{textos.home.eventsTitle}</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{textos.home.eventsDescription}</p>
          </div>
          <Link
            href="/eventos"
            className="flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800 dark:text-brand-300"
          >
            Ver calendário
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
        {eventos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            Não há eventos publicados no momento.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {eventos.map((evento) => {
              const imagemEvento = extractFirstImageSrcFromHtml(evento.conteudo);
              return (
                <div
                  key={evento.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex gap-4">
                    {imagemEvento ? (
                      <Link
                        href={`/eventos/${evento.id}`}
                        className="h-16 w-20 shrink-0 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800"
                        aria-label={`Ver evento ${evento.titulo}`}
                      >
                        <img
                          src={toPublicUrl(imagemEvento)}
                          alt={evento.titulo}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                      </Link>
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-md bg-brand-100 dark:bg-brand-900/50">
                        <span className="text-2xl font-bold text-brand-700 dark:text-brand-300">
                          {new Date(evento.dataInicio).getDate()}
                        </span>
                        <span className="text-xs uppercase text-brand-700 dark:text-brand-300">
                          {new Date(evento.dataInicio).toLocaleDateString("pt-BR", { month: "short" })}
                        </span>
                      </div>
                    )}
                    <div className="flex-1">
                      <Link
                        href={`/eventos/${evento.id}`}
                        className="line-clamp-2 font-semibold text-slate-900 hover:text-brand-700 dark:text-slate-100 dark:hover:text-brand-300"
                      >
                        {evento.titulo}
                      </Link>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{evento.descricao}</p>
                      <div className="mt-2 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        {evento.local}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

const defaultAcessoRapido = [
  {
    label: "Documentos",
    href: "/documentos",
    descricao: "Editais, arquivos de matrícula e regimento escolar.",
    newTab: false
  },
  {
    label: "Calendário",
    href: "/eventos",
    descricao: "Veja os eventos e reuniões programadas.",
    newTab: false
  },
  {
    label: "Secretaria Virtual",
    href: "/contato",
    descricao: "Fale conosco ou solicite declarações online.",
    newTab: false
  }
];

function safeParse(value: string) {
  // Evita quebrar a pagina caso o JSON salvo esteja invalido.
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
