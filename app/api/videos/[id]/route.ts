import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { Permissions } from "@/lib/permissions";
import { logAuditoria } from "@/lib/audit";

const validDisplayModes = ["AUTO", "EMBED", "EXTERNO"] as const;
const validMoveDirections = ["up", "down"] as const;

function normalizeOrder(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { allowed, session } = await requirePermission(Permissions.VIDEOS_WRITE);
  if (!allowed || !session) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const moveDirection = String(body?.move ?? "").toLowerCase();

  if (validMoveDirections.includes(moveDirection as (typeof validMoveDirections)[number])) {
    const video = await reorderLinkedVideos(params.id, moveDirection as "up" | "down");
    if (!video) {
      return NextResponse.json({ error: "Vídeo não encontrado" }, { status: 404 });
    }

    await logAuditoria({
      acao: "ORDENAR",
      entidade: "video_galeria",
      registroId: video.id,
      usuarioId: session.user.id
    });

    return NextResponse.json(video);
  }

  const titulo = String(body?.titulo ?? "").trim();
  const descricao = String(body?.descricao ?? "").trim();
  const url = String(body?.url ?? "").trim();
  const ordem = normalizeOrder(body?.ordem);
  const modoExibicaoRaw = String(body?.modoExibicao ?? "AUTO").toUpperCase();
  const modoExibicao = validDisplayModes.includes(modoExibicaoRaw as (typeof validDisplayModes)[number])
    ? modoExibicaoRaw
    : "AUTO";

  if (!titulo || !url) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const video = await db.videoGaleria.update({
    where: { id: params.id },
    data: {
      titulo,
      descricao: descricao || null,
      url,
      modoExibicao,
      ordem
    }
  });

  await logAuditoria({
    acao: "ATUALIZAR",
    entidade: "video_galeria",
    registroId: video.id,
    usuarioId: session.user.id
  });

  return NextResponse.json(video);
}

async function reorderLinkedVideos(videoId: string, direction: "up" | "down") {
  const videos = await db.videoGaleria.findMany({
    select: { id: true },
    orderBy: [{ ordem: "asc" }, { dataPublicacao: "desc" }, { id: "asc" }]
  });
  const currentIndex = videos.findIndex((video) => video.id === videoId);
  if (currentIndex === -1) return null;

  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= videos.length) {
    return db.videoGaleria.findUnique({ where: { id: videoId } });
  }

  const ordered = [...videos];
  [ordered[currentIndex], ordered[targetIndex]] = [ordered[targetIndex], ordered[currentIndex]];

  await db.$transaction(
    ordered.map((video, index) =>
      db.videoGaleria.update({
        where: { id: video.id },
        data: { ordem: index }
      })
    )
  );

  return db.videoGaleria.findUnique({ where: { id: videoId } });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const { allowed, session } = await requirePermission(Permissions.VIDEOS_WRITE);
  if (!allowed || !session) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const video = await db.videoGaleria.findUnique({ where: { id: params.id } });
  if (!video) {
    return NextResponse.json({ error: "Vídeo não encontrado" }, { status: 404 });
  }

  await db.videoGaleria.delete({ where: { id: params.id } });

  await logAuditoria({
    acao: "EXCLUIR",
    entidade: "video_galeria",
    registroId: video.id,
    usuarioId: session.user.id
  });

  return NextResponse.json({ ok: true });
}
