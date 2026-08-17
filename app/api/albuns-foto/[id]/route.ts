import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { Permissions } from "@/lib/permissions";
import { logAuditoria } from "@/lib/audit";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { allowed, session } = await requirePermission(Permissions.MEDIA_WRITE);
    if (!allowed || !session) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const nome = String(body?.nome ?? "").trim();
    const descricao = String(body?.descricao ?? "").trim();
    const ordem = Number(body?.ordem ?? 0);
    const capaMidiaIdRaw = body?.capaMidiaId;
    const capaMidiaId = typeof capaMidiaIdRaw === "string" && capaMidiaIdRaw.trim() ? capaMidiaIdRaw.trim() : null;

    if (!nome) {
      return NextResponse.json({ error: "Nome do álbum é obrigatório" }, { status: 400 });
    }

    if (capaMidiaId) {
      const capa = await db.midia.findUnique({ where: { id: capaMidiaId }, select: { id: true, albumId: true, tipo: true } });
      if (!capa || !capa.tipo.startsWith("image/")) {
        return NextResponse.json({ error: "Capa inválida" }, { status: 400 });
      }
      if (capa.albumId !== params.id) {
        return NextResponse.json({ error: "A capa precisa pertencer ao álbum" }, { status: 400 });
      }
    }

    const album = await db.albumFoto.update({
      where: { id: params.id },
      data: {
        nome,
        descricao: descricao || null,
        ordem: Number.isFinite(ordem) ? ordem : 0,
        capaMidiaId
      }
    });

    await logAuditoria({
      acao: "ATUALIZAR",
      entidade: "album_foto",
      registroId: album.id,
      usuarioId: session.user.id
    });

    return NextResponse.json(album);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno ao atualizar álbum";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const { allowed, session } = await requirePermission(Permissions.MEDIA_WRITE);
    if (!allowed || !session) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    await db.albumFoto.delete({ where: { id: params.id } });

    await logAuditoria({
      acao: "EXCLUIR",
      entidade: "album_foto",
      registroId: params.id,
      usuarioId: session.user.id
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno ao excluir álbum";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
