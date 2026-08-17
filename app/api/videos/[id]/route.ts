import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { Permissions } from "@/lib/permissions";
import { logAuditoria } from "@/lib/audit";

const validDisplayModes = ["AUTO", "EMBED", "EXTERNO"] as const;

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { allowed, session } = await requirePermission(Permissions.VIDEOS_WRITE);
  if (!allowed || !session) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const titulo = String(body?.titulo ?? "").trim();
  const descricao = String(body?.descricao ?? "").trim();
  const url = String(body?.url ?? "").trim();
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
      modoExibicao
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
