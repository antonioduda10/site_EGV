import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { Permissions } from "@/lib/permissions";
import { logAuditoria } from "@/lib/audit";

const validDisplayModes = ["AUTO", "EMBED", "EXTERNO"] as const;

export async function GET() {
  const videos = await db.videoGaleria.findMany({ orderBy: { dataPublicacao: "desc" } });
  return NextResponse.json(videos);
}

export async function POST(request: Request) {
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

  const video = await db.videoGaleria.create({
    data: {
      titulo,
      descricao: descricao || null,
      url,
      modoExibicao
    }
  });

  await logAuditoria({
    acao: "CRIAR",
    entidade: "video_galeria",
    registroId: video.id,
    usuarioId: session.user.id
  });

  return NextResponse.json(video, { status: 201 });
}
