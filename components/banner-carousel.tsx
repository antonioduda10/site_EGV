"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toPublicUrl } from "@/lib/uploads-url";

type Banner = {
  id: string;
  titulo: string;
  descricao: string | null;
  imagem: string;
  link: string | null;
  ordem: number;
  ativo: boolean;
};

export function BannerCarousel({ banners, intervalMs = 5000 }: { banners: Banner[]; intervalMs?: number }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const safeIntervalMs = Number.isFinite(intervalMs) ? Math.min(15000, Math.max(3000, intervalMs)) : 5000;

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pauseForReducedMotion = () => { setReducedMotion(preference.matches); };
    pauseForReducedMotion();
    preference.addEventListener("change", pauseForReducedMotion);
    return () => preference.removeEventListener("change", pauseForReducedMotion);
  }, []);

  useEffect(() => {
    if (reducedMotion || banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, safeIntervalMs);

    return () => clearInterval(interval);
  }, [reducedMotion, banners.length, safeIntervalMs, currentIndex]);

  if (banners.length === 0) {
    return (
      <div className="relative w-full h-64 md:h-96 bg-slate-100 rounded-lg flex items-center justify-center dark:bg-slate-900">
        <p className="text-slate-600 dark:text-slate-300">Nenhum banner configurado</p>
      </div>
    );
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const currentBanner = banners[currentIndex % banners.length];
  const imageUrl = toPublicUrl(currentBanner.imagem);

  const bannerContent = (
    <div className="relative w-full h-full">
      <img
        src={imageUrl}
        alt={currentBanner.titulo}
        loading="eager"
        decoding="async"
        fetchPriority="high"
        className="w-full h-full object-cover"
      />

      {/* Overlay com texto */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end">
        <div className={`p-6 text-white ${banners.length > 1 ? "pb-20" : ""}`}>
          <h2 className="text-2xl md:text-3xl font-bold">{currentBanner.titulo}</h2>
          {currentBanner.descricao && (
            <p className="mt-2 text-sm md:text-base opacity-90">{currentBanner.descricao}</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative w-full h-64 md:h-96 rounded-lg overflow-hidden group">
      {/* Banner clicável quando houver link */}
      {currentBanner.link ? (
        <Link href={currentBanner.link} className="block w-full h-full">
          {bannerContent}
        </Link>
      ) : (
        bannerContent
      )}

      {/* Botões de navegação */}
      {banners.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white text-slate-900 hover:bg-slate-100 flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
            aria-label="Banner anterior"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white text-slate-900 hover:bg-slate-100 flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
            aria-label="Próximo banner"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Indicadores */}
          <div className="absolute bottom-2 left-1/2 flex max-w-[calc(100%-2rem)] -translate-x-1/2 gap-1 overflow-x-auto rounded-full bg-black/50 px-1">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className="z-20 flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                aria-current={index === currentIndex % banners.length ? "true" : undefined}
                aria-label={`Ir para slide ${index + 1}`}
              >
                <span aria-hidden="true" className={`h-2 rounded-full ${index === currentIndex % banners.length ? "w-6 bg-white" : "w-2 bg-white/70"}`} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
