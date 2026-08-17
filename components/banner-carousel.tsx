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
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const safeIntervalMs = Number.isFinite(intervalMs) ? Math.min(15000, Math.max(3000, intervalMs)) : 5000;

  useEffect(() => {
    if (!isAutoPlaying || banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, safeIntervalMs);

    return () => clearInterval(interval);
  }, [isAutoPlaying, banners.length, safeIntervalMs]);

  if (banners.length === 0) {
    return (
      <div className="relative w-full h-64 md:h-96 bg-slate-100 rounded-lg flex items-center justify-center">
        <p className="text-slate-500">Nenhum banner configurado</p>
      </div>
    );
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
    setIsAutoPlaying(false);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
    setIsAutoPlaying(false);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
  };

  const currentBanner = banners[currentIndex];
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
        <div className="p-6 text-white">
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
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/80 hover:bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Banner anterior"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/80 hover:bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Próximo banner"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Indicadores */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`z-20 w-2 h-2 rounded-full transition-all ${
                  index === currentIndex ? "bg-white w-8" : "bg-white/50"
                }`}
                aria-label={`Ir para slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
