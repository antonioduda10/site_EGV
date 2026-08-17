import { db } from "@/lib/db";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { MidiaForm } from "@/components/forms/midia-form";
import { AlbumFotoForm } from "@/components/forms/album-foto-form";
import { requirePermission } from "@/lib/require-permission";
import { Permissions } from "@/lib/permissions";
import { MidiaActions } from "@/components/dashboard/midia-actions";
import { AlbumFotoActions } from "@/components/dashboard/album-foto-actions";
import { toPublicUrl } from "@/lib/uploads-url";
import type { ReactNode } from "react";

export default async function GaleriaFotosPage() {
  const { allowed } = await requirePermission(Permissions.MEDIA_WRITE);
  if (!allowed) {
    return (
      <div>
        <DashboardTopbar title="Galeria de fotos" />
        <div className="p-6 text-sm text-slate-600">Sem permissão para acessar.</div>
      </div>
    );
  }

  // Filtra somente imagens para a galeria de fotos.
  const midias = await db.midia.findMany({
    where: { tipo: { startsWith: "image/" } },
    orderBy: [{ ordem: "asc" }, { dataUpload: "desc" }],
    include: { album: { select: { id: true, nome: true } } }
  });

  const albuns = await db.albumFoto.findMany({
    orderBy: [{ ordem: "asc" }, { dataCriacao: "desc" }],
    include: {
      _count: { select: { midias: true } },
      capaMidia: { select: { id: true, titulo: true } },
      midias: {
        where: { tipo: { startsWith: "image/" } },
        select: { id: true, titulo: true },
        orderBy: [{ ordem: "asc" }, { dataUpload: "desc" }]
      }
    }
  });

  const albumOptions = albuns.map((album) => ({ id: album.id, nome: album.nome }));
  const fotosComAlbum = midias.filter((midia) => Boolean(midia.albumId)).length;
  const fotosSemAlbum = midias.length - fotosComAlbum;
  const albunsComFotos = albuns.filter((album) => album._count.midias > 0).length;

  return (
    <div>
      <DashboardTopbar title="Galeria de fotos" />
      <div className="grid gap-6 p-6">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-0 lg:grid-cols-[1fr_340px]">
            <div className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700 dark:text-brand-300">
                Memória escolar
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                Organize álbuns e fotos da galeria
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Cadastre álbuns, envie fotos, defina capas e mantenha os registros visuais da escola bem organizados.
              </p>
            </div>
            <div className="flex items-center border-t border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950/50 lg:border-l lg:border-t-0">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Álbuns com fotos</p>
                <p className="mt-1 text-4xl font-bold text-brand-700 dark:text-brand-300">{albunsComFotos}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">de {albuns.length} álbum(ns) cadastrados</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ResumoCard title="Álbuns" value={albuns.length} hint="Coleções cadastradas" tone="brand" />
          <ResumoCard title="Fotos" value={midias.length} hint="Imagens enviadas" tone="emerald" />
          <ResumoCard title="Com álbum" value={fotosComAlbum} hint="Fotos organizadas" tone="sky" />
          <ResumoCard title="Sem álbum" value={fotosSemAlbum} hint="Ainda sem coleção" tone="amber" />
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <AlbumFotoForm />
          <MidiaForm enableAlbums albums={albumOptions} />
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 p-5 dark:border-slate-800">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Álbuns</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Defina a organização, ordem e capa das coleções de fotos.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {albuns.length} registro(s)
              </span>
            </div>
          </div>
          {albuns.length === 0 ? (
            <div className="p-6 text-sm text-slate-600 dark:text-slate-300">Nenhum álbum cadastrado ainda.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
                    <th className="p-4">Álbum</th>
                    <th className="p-4">Capa</th>
                    <th className="p-4">Ordem</th>
                    <th className="p-4">Fotos</th>
                    <th className="p-4">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {albuns.map((album) => (
                    <tr key={album.id} className="border-b border-slate-100 align-top last:border-b-0 dark:border-slate-800/70">
                      <td className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-sm font-bold text-brand-700 ring-1 ring-brand-100 dark:bg-brand-900/30 dark:text-brand-300 dark:ring-brand-900/60">
                            {getInitials(album.nome)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 dark:text-slate-100">{album.nome}</p>
                            <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                              {album.descricao || "Sem descrição cadastrada."}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
                        {album.capaMidia?.titulo ?? "Automática"}
                      </td>
                      <td className="p-4">
                        <Badge tone="slate">#{album.ordem}</Badge>
                      </td>
                      <td className="p-4">
                        <Badge tone={album._count.midias > 0 ? "emerald" : "amber"}>{album._count.midias} foto(s)</Badge>
                      </td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
                        <AlbumFotoActions
                          album={album}
                          coverOptions={album.midias.map((item) => ({ id: item.id, titulo: item.titulo }))}
                        />
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
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Fotos</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Imagens disponíveis na galeria pública, com álbum e ordem de exibição.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {midias.length} registro(s)
              </span>
            </div>
          </div>
          {midias.length === 0 ? (
            <div className="p-6 text-sm text-slate-600 dark:text-slate-300">Nenhuma foto enviada ainda.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
                    <th className="p-4">Foto</th>
                    <th className="p-4">Data</th>
                    <th className="p-4">Álbum</th>
                    <th className="p-4">Ordem</th>
                    <th className="p-4">Arquivo</th>
                    <th className="p-4">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {midias.map((midia) => (
                    <tr key={midia.id} className="border-b border-slate-100 align-top last:border-b-0 dark:border-slate-800/70">
                      <td className="p-4">
                        <div className="flex items-start gap-4">
                          <img
                            src={toPublicUrl(midia.caminho)}
                            alt={midia.titulo}
                            loading="lazy"
                            decoding="async"
                            className="h-20 w-28 shrink-0 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-800"
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 dark:text-slate-100">{midia.titulo}</p>
                            <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                              {midia.descricao || "Sem descrição cadastrada."}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
                        {formatDate(midia.dataReferencia ?? midia.dataUpload, Boolean(midia.dataReferencia))}
                      </td>
                      <td className="p-4">
                        <Badge tone={midia.album ? "sky" : "amber"}>{midia.album?.nome ?? "Sem álbum"}</Badge>
                      </td>
                      <td className="p-4">
                        <Badge tone="slate">#{midia.ordem}</Badge>
                      </td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
                        <p>{fileTypeLabel(midia.tipo)}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatBytes(midia.tamanho)}</p>
                      </td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
                        <MidiaActions midia={midia} albumOptions={albumOptions} />
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

function Badge({ children, tone }: { children: ReactNode; tone: "emerald" | "amber" | "sky" | "slate" }) {
  const toneClasses = {
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60",
    amber: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60",
    sky: "bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900/60",
    slate: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700"
  }[tone];

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${toneClasses}`}>
      {children}
    </span>
  );
}

function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "A";
}

function formatDate(value: Date | string, utc = false) {
  return new Date(value).toLocaleDateString("pt-BR", utc ? { timeZone: "UTC" } : undefined);
}

function fileTypeLabel(type: string) {
  if (type.includes("jpeg") || type.includes("jpg")) return "JPG";
  if (type.includes("png")) return "PNG";
  if (type.includes("webp")) return "WebP";
  return type || "Imagem";
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
