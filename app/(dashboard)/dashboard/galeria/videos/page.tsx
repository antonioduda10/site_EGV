import { db } from "@/lib/db";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { VideoForm } from "@/components/forms/video-form";
import { MidiaForm } from "@/components/forms/midia-form";
import { requirePermission } from "@/lib/require-permission";
import { Permissions } from "@/lib/permissions";
import { VideoActions } from "@/components/dashboard/video-actions";
import { MidiaActions } from "@/components/dashboard/midia-actions";
import type { ReactNode } from "react";

export default async function GaleriaVideosPage() {
  const { allowed: canManageVideos } = await requirePermission(Permissions.VIDEOS_WRITE);
  const { allowed: canManageMedia } = await requirePermission(Permissions.MEDIA_WRITE);

  if (!canManageVideos && !canManageMedia) {
    return (
      <div>
        <DashboardTopbar title="Galeria de vídeos" />
        <div className="p-6 text-sm text-slate-600">Sem permissão para acessar.</div>
      </div>
    );
  }

  // Lista videos por link e uploads de audio/video separadamente.
  const videos = await db.videoGaleria.findMany({ orderBy: { dataPublicacao: "desc" } });
  const uploads = await db.midia.findMany({
    where: {
      OR: [{ tipo: { startsWith: "audio/" } }, { tipo: { startsWith: "video/" } }]
    },
    orderBy: { dataUpload: "desc" }
  });

  const videosUpload = uploads.filter((midia) => midia.tipo.startsWith("video/"));
  const audiosUpload = uploads.filter((midia) => midia.tipo.startsWith("audio/"));
  const totalMidias = videosUpload.length + audiosUpload.length;

  return (
    <div>
      <DashboardTopbar title="Galeria de vídeos" />
      <div className="grid gap-6 p-6">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-0 lg:grid-cols-[1fr_340px]">
            <div className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700 dark:text-brand-300">
                Vídeos e áudios
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                Gerencie mídias em movimento
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Cadastre vídeos por link, envie arquivos de áudio ou vídeo e organize os materiais exibidos na galeria pública.
              </p>
            </div>
            <div className="flex items-center border-t border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950/50 lg:border-l lg:border-t-0">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Total de mídias</p>
                <p className="mt-1 text-4xl font-bold text-brand-700 dark:text-brand-300">{videos.length + totalMidias}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">links, vídeos enviados e áudios</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ResumoCard title="Links" value={videos.length} hint="Vídeos externos" tone="brand" />
          <ResumoCard title="Uploads" value={totalMidias} hint="Arquivos enviados" tone="emerald" />
          <ResumoCard title="Vídeos" value={videosUpload.length} hint="Uploads de vídeo" tone="sky" />
          <ResumoCard title="Áudios" value={audiosUpload.length} hint="Uploads de áudio" tone="amber" />
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          {canManageVideos ? (
            <VideoForm />
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
              Sem permissão para cadastrar vídeos por link.
            </div>
          )}

          {canManageMedia ? (
            <MidiaForm
              title="Novo áudio ou vídeo (upload)"
              accept="audio/*,video/*"
              helperText="Formatos aceitos: áudio (MP3/WAV/OGG/M4A) e vídeo (MP4/WebM/OGG/MOV)."
            />
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
              Sem permissão para upload de áudio/vídeo.
            </div>
          )}
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 p-5 dark:border-slate-800">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Vídeos por link</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Links externos ou incorporados, como vídeos do YouTube.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {videos.length} registro(s)
              </span>
            </div>
          </div>
          {videos.length === 0 ? (
            <div className="p-6 text-sm text-slate-600 dark:text-slate-300">Nenhum vídeo por link cadastrado ainda.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
                    <th className="p-4">Vídeo</th>
                    <th className="p-4">Modo</th>
                    <th className="p-4">Link</th>
                    <th className="p-4">Cadastro</th>
                    <th className="p-4">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {videos.map((video) => (
                    <tr key={video.id} className="border-b border-slate-100 align-top last:border-b-0 dark:border-slate-800/70">
                      <td className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-sm font-bold text-brand-700 ring-1 ring-brand-100 dark:bg-brand-900/30 dark:text-brand-300 dark:ring-brand-900/60">
                            ▶
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 dark:text-slate-100">{video.titulo}</p>
                            <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                              {video.descricao || "Sem descrição cadastrada."}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge tone="sky">{formatVideoMode(video.modoExibicao)}</Badge>
                      </td>
                      <td className="p-4 text-sm">
                        <span className="block max-w-[260px] truncate rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          {video.url}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-300">{formatDate(video.dataPublicacao)}</td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
                        {canManageVideos ? <VideoActions video={video} /> : "Sem permissão"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 p-5 dark:border-slate-800">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Uploads de áudio/vídeo</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Arquivos enviados diretamente para a galeria.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {totalMidias} registro(s)
              </span>
            </div>
          </div>
          {totalMidias === 0 ? (
            <div className="p-6 text-sm text-slate-600 dark:text-slate-300">Nenhum upload de áudio ou vídeo cadastrado ainda.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
                    <th className="p-4">Mídia</th>
                    <th className="p-4">Tipo</th>
                    <th className="p-4">Data</th>
                    <th className="p-4">Arquivo</th>
                    <th className="p-4">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {[...videosUpload, ...audiosUpload].map((midia) => (
                    <tr key={midia.id} className="border-b border-slate-100 align-top last:border-b-0 dark:border-slate-800/70">
                      <td className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
                            {midia.tipo.startsWith("audio/") ? "A" : "V"}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 dark:text-slate-100">{midia.titulo}</p>
                            <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                              {midia.descricao || "Sem descrição cadastrada."}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge tone={midia.tipo.startsWith("audio/") ? "amber" : "emerald"}>
                          {midia.tipo.startsWith("audio/") ? "Áudio" : "Vídeo"}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
                        {formatDate(midia.dataReferencia ?? midia.dataUpload)}
                      </td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
                        <p>{fileTypeLabel(midia.tipo)}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatBytes(midia.tamanho)}</p>
                      </td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
                        {canManageMedia ? <MidiaActions midia={midia} /> : "Sem permissão"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ResumoCard({
  title,
  value,
  hint,
  tone
}: {
  title: string;
  value: number;
  hint: string;
  tone: "brand" | "emerald" | "amber" | "sky";
}) {
  const toneClasses = {
    brand: "bg-brand-50 text-brand-700 ring-brand-100 dark:bg-brand-900/30 dark:text-brand-300 dark:ring-brand-900/60",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60",
    amber: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60",
    sky: "bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900/60"
  }[tone];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${toneClasses}`}>{title}</div>
      <p className="mt-4 text-3xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{hint}</p>
    </div>
  );
}

function Badge({ children, tone }: { children: ReactNode; tone: "emerald" | "amber" | "sky" }) {
  const toneClasses = {
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60",
    amber: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60",
    sky: "bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900/60"
  }[tone];

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${toneClasses}`}>
      {children}
    </span>
  );
}

function formatVideoMode(mode: string) {
  if (mode === "EXTERNO") return "Abrir no YouTube";
  if (mode === "EMBED") return "Incorporado";
  return "Automático";
}

function formatDate(value: Date | string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("pt-BR");
}

function fileTypeLabel(type: string) {
  if (type.startsWith("audio/")) return type.replace("audio/", "").toUpperCase();
  if (type.startsWith("video/")) return type.replace("video/", "").toUpperCase();
  return type || "Arquivo";
}

function formatBytes(value: number) {
  if (!value) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: unitIndex === 0 ? 0 : 1 }).format(size)} ${units[unitIndex]}`;
}
