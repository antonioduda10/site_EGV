import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { Permissions } from "@/lib/permissions";
import { deleteFile } from "@/lib/uploads";
import { logAuditoria } from "@/lib/audit";

const validMoveDirections = ["up", "down"] as const;

function parseDateOnlyToUtc(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  // Atualizacao exige permissao.
  const { allowed, session } = await requirePermission(Permissions.MEDIA_WRITE);
  if (!allowed || !session) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  // JSON pode vir vazio; aplica fallback.
  const body = await request.json().catch(() => ({}));
  const moveDirection = String(body?.move ?? "").toLowerCase();

  if (validMoveDirections.includes(moveDirection as (typeof validMoveDirections)[number])) {
    const midia = await reorderMedia(params.id, moveDirection as "up" | "down", body?.scope);
    if (!midia) {
      return NextResponse.json({ error: "Mídia não encontrada" }, { status: 404 });
    }

    await logAuditoria({
      acao: "ORDENAR",
      entidade: "midia",
      registroId: midia.id,
      usuarioId: session.user.id
    });

    return NextResponse.json(midia);
  }

  const titulo = String(body?.titulo ?? "").trim();
  const descricao = String(body?.descricao ?? "").trim();
  const dataReferenciaRaw = body?.dataReferencia;
  const ordemRaw = body?.ordem;
  const albumIdRaw = body?.albumId;
  if (!titulo) {
    return NextResponse.json({ error: "Título inválido" }, { status: 400 });
  }

  let dataReferencia: Date | null | undefined = undefined;
  if (dataReferenciaRaw === null || dataReferenciaRaw === "") {
    dataReferencia = null;
  } else if (typeof dataReferenciaRaw === "string") {
    const parsed = parseDateOnlyToUtc(dataReferenciaRaw);
    if (!parsed) {
      return NextResponse.json({ error: "Data da foto inválida" }, { status: 400 });
    }
    dataReferencia = parsed;
  }

  let ordem: number | undefined = undefined;
  if (ordemRaw !== undefined) {
    const parsed = Number(ordemRaw);
    if (!Number.isFinite(parsed)) {
      return NextResponse.json({ error: "Ordem inválida" }, { status: 400 });
    }
    ordem = Math.max(0, Math.trunc(parsed));
  }

  let albumId: string | null | undefined = undefined;
  if (albumIdRaw !== undefined) {
    if (albumIdRaw === null || albumIdRaw === "") {
      albumId = null;
    } else if (typeof albumIdRaw === "string") {
      const album = await db.albumFoto.findUnique({ where: { id: albumIdRaw }, select: { id: true } });
      if (!album) {
        return NextResponse.json({ error: "Álbum inválido" }, { status: 400 });
      }
      albumId = album.id;
    }
  }

  const midia = await db.midia.update({
    where: { id: params.id },
    data: {
      titulo,
      descricao: descricao || null,
      dataReferencia,
      ordem,
      albumId
    }
  });

  // Auditoria da atualizacao.
  await logAuditoria({
    acao: "ATUALIZAR",
    entidade: "midia",
    registroId: midia.id,
    usuarioId: session.user.id
  });

  return NextResponse.json(midia);
}

async function reorderMedia(midiaId: string, direction: "up" | "down", scope: unknown) {
  const where =
    scope === "audio-video"
      ? {
          OR: [{ tipo: { startsWith: "audio/" } }, { tipo: { startsWith: "video/" } }]
        }
      : undefined;

  const midias = await db.midia.findMany({
    where,
    select: { id: true },
    orderBy: [{ ordem: "asc" }, { dataUpload: "desc" }, { id: "asc" }]
  });
  const currentIndex = midias.findIndex((midia) => midia.id === midiaId);
  if (currentIndex === -1) return null;

  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= midias.length) {
    return db.midia.findUnique({ where: { id: midiaId } });
  }

  const ordered = [...midias];
  [ordered[currentIndex], ordered[targetIndex]] = [ordered[targetIndex], ordered[currentIndex]];

  await db.$transaction(
    ordered.map((midia, index) =>
      db.midia.update({
        where: { id: midia.id },
        data: { ordem: index }
      })
    )
  );

  return db.midia.findUnique({ where: { id: midiaId } });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  // Exclusao exige permissao.
  const { allowed, session } = await requirePermission(Permissions.MEDIA_WRITE);
  if (!allowed || !session) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const midia = await db.midia.findUnique({ where: { id: params.id } });
  if (!midia) {
    return NextResponse.json({ error: "Mídia não encontrada" }, { status: 404 });
  }

  // Remove arquivo e registro.
  await deleteFile(midia.caminho);
  await db.midia.delete({ where: { id: params.id } });

  // Auditoria da exclusao.
  await logAuditoria({
    acao: "EXCLUIR",
    entidade: "midia",
    registroId: midia.id,
    usuarioId: session.user.id
  });

  return NextResponse.json({ ok: true });
}
