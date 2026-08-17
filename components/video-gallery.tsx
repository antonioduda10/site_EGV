"use client";

import { useEffect, useState } from "react";

type VideoItem = {
  id: string;
  titulo: string;
  descricao: string | null;
  url: string;
  modoExibicao?: "AUTO" | "EMBED" | "EXTERNO" | string;
  curtidas: number;
  visualizacoes: number;
};

const getYouTubeId = (url: string) => {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id ?? null;
    }
    if (parsed.hostname.includes("youtube.com")) {
      const vParam = parsed.searchParams.get("v") || parsed.searchParams.get("vi");
      if (vParam) return vParam;

      const parts = parsed.pathname.split("/").filter(Boolean);
      const marker = parts[0];
      if (marker === "shorts" || marker === "embed" || marker === "live") {
        return parts[1] ?? null;
      }
    }
    return null;
  } catch {
    return null;
  }
};

const toEmbedUrl = (url: string, origin?: string) => {
  const id = getYouTubeId(url);
  if (id) {
    const embed = new URL(`https://www.youtube.com/embed/${id}`);
    embed.searchParams.set("rel", "0");
    embed.searchParams.set("modestbranding", "1");
    embed.searchParams.set("playsinline", "1");
    embed.searchParams.set("enablejsapi", "1");
    if (origin) {
      embed.searchParams.set("origin", origin);
      embed.searchParams.set("widget_referrer", origin);
    }
    return embed.toString();
  }
  return url;
};

const toWatchUrl = (url: string) => {
  const id = getYouTubeId(url);
  if (id) return `https://www.youtube.com/watch?v=${id}`;
  return url;
};

const toThumbnailUrl = (url: string) => {
  const id = getYouTubeId(url);
  if (!id) return null;
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
};

export function VideoGallery({ videos }: { videos: VideoItem[] }) {
  const [items, setItems] = useState(videos);

  const handleLike = async (id: string) => {
    const response = await fetch(`/api/videos/${id}/like`, { method: "POST" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return;
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, curtidas: data.curtidas ?? item.curtidas } : item))
    );
  };

  const handleView = async (id: string, url: string) => {
    const response = await fetch(`/api/videos/${id}/view`, { method: "POST" });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, visualizacoes: data.visualizacoes ?? item.visualizacoes } : item
        )
      );
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {items.map((video) => (
        <div
          key={video.id}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="aspect-video bg-slate-950">
            <VideoPlayerEmbed url={video.url} titulo={video.titulo} modoExibicao={video.modoExibicao} />
          </div>
          <div className="space-y-3 p-4">
            <h3 className="rounded-xl bg-slate-100 px-3 py-2 text-lg font-semibold text-slate-900 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700">
              {video.titulo}
            </h3>
            {video.descricao && <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{video.descricao}</p>}
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
                <span className="rounded-full bg-emerald-600 px-1.5 text-[10px] text-white dark:bg-emerald-500">{video.visualizacoes}</span>
                visualizações
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-200">
                <span className="rounded-full bg-brand-600 px-1.5 text-[10px] text-white dark:bg-brand-500">{video.curtidas}</span>
                curtidas
              </span>
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleLike(video.id)}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                Curtir
              </button>
              <button
                type="button"
                onClick={() => handleView(video.id, toWatchUrl(video.url))}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-700 dark:border-slate-700 dark:text-slate-200 dark:hover:border-brand-700 dark:hover:text-brand-300"
              >
                Assistir
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    document.body.removeChild(textarea);
    return false;
  }
}

function VideoPlayerEmbed({ url, titulo, modoExibicao }: { url: string; titulo: string; modoExibicao?: string }) {
  const [mounted, setMounted] = useState(false);
  const [embedFailed, setEmbedFailed] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "ok" | "error">("idle");
  const origin = mounted ? window.location.origin : undefined;
  const hostname = mounted ? window.location.hostname : "";
  const isYouTube = Boolean(getYouTubeId(url));
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
  const displayMode = (modoExibicao ?? "AUTO").toUpperCase();
  const shouldUseExternalOnly = displayMode === "EXTERNO" || (displayMode === "AUTO" && isYouTube && !isLocalhost);
  const embedUrl = toEmbedUrl(url, origin);
  const watchUrl = toWatchUrl(url);
  const thumbnailUrl = toThumbnailUrl(url);

  const handleCopy = async () => {
    const ok = await copyText(watchUrl);
    setCopyStatus(ok ? "ok" : "error");
    window.setTimeout(() => setCopyStatus("idle"), 2200);

    if (!ok) {
      window.prompt("Copie manualmente o link do vídeo:", watchUrl);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-full w-full bg-slate-900" />;
  }

  if (shouldUseExternalOnly) {
    return (
      <div className="h-full w-full relative bg-black">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={titulo}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover opacity-90"
          />
        ) : null}
        <div className="absolute inset-0 bg-black/45 flex flex-col items-center justify-center gap-3 px-4 text-center">
          <p className="text-white text-sm max-w-md">
            Neste acesso em rede, abra o vídeo no YouTube para reprodução completa.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <a
              href={watchUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 rounded border border-white text-white text-sm font-medium"
            >
              Assistir no YouTube
            </a>
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-2 rounded bg-white text-slate-900 text-sm font-medium"
            >
              {copyStatus === "ok" ? "Link copiado" : copyStatus === "error" ? "Falha ao copiar" : "Copiar link"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (embedFailed) {
    return (
      <a href={watchUrl} target="_blank" rel="noreferrer" className="block h-full w-full relative">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={titulo}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover opacity-90"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-white text-sm px-4 text-center">
            Vídeo indisponível neste dispositivo. Clique para assistir no YouTube.
          </div>
        )}
        <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
          <span className="px-3 py-2 rounded bg-white text-slate-900 text-sm font-medium">Assistir no YouTube</span>
        </div>
      </a>
    );
  }

  return (
    <iframe
      src={embedUrl}
      title={titulo}
      className="w-full h-full"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      referrerPolicy="origin-when-cross-origin"
      allowFullScreen
      onError={() => setEmbedFailed(true)}
    />
  );
}
