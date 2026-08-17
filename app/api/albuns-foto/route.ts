import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { Permissions } from "@/lib/permissions";
import { logAuditoria } from "@/lib/audit";

export async function GET() {
  const albuns = await db.albumFoto.findMany({
    orderBy: [{ ordem: "asc" }, { dataCriacao: "desc" }],
    include: {
      capaMidia: true,
      _count: { select: { midias: true } }
    }
  });

  return NextResponse.json(albuns);
}

export async function POST(request: Request) {
  try {
    const { allowed, session } = await requirePermission(Permissions.MEDIA_WRITE);
    if (!allowed || !session) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const nome = String(body?.nome ?? "").trim();
    const descricao = String(body?.descricao ?? "").trim();
    const ordem = Number(body?.ordem ?? 0);

    if (!nome) {
      return NextResponse.json({ error: "Nome do álbum é obrigatório" }, { status: 400 });
    }

    const album = await db.albumFoto.create({
      data: {
        nome,
        descricao: descricao || null,
        ordem: Number.isFinite(ordem) ? ordem : 0
      }
    });

    await logAuditoria({
      acao: "CRIAR",
      entidade: "album_foto",
      registroId: album.id,
      usuarioId: session.user.id
    });

    return NextResponse.json(album, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno ao criar álbum";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
