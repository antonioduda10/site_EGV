import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { Permissions } from "@/lib/permissions";
import { uploadFile } from "@/lib/uploads";
import { logAuditoria } from "@/lib/audit";

// Tipos permitidos para uploads de audio/video/imagem.
const allowedTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
  "audio/mp4",
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime"
];

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

export async function GET() {
  const midias = await db.midia.findMany({ orderBy: { dataUpload: "desc" } });
  return NextResponse.json(midias);
}

export async function POST(request: Request) {
  // Protege o upload de midia.
  const { allowed, session } = await requirePermission(Permissions.MEDIA_WRITE);
  if (!allowed || !session) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  // Le multipart com titulo e arquivo.
  const formData = await request.formData();
  const titulo = String(formData.get("titulo") ?? "");
  const descricao = String(formData.get("descricao") ?? "").trim();
  const dataReferenciaRaw = String(formData.get("dataReferencia") ?? "").trim();
  const ordemRaw = String(formData.get("ordem") ?? "0").trim();
  const albumIdRaw = String(formData.get("albumId") ?? "").trim();
  const arquivo = formData.get("arquivo") as File | null;
  if (!titulo || !arquivo) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const dataReferencia = dataReferenciaRaw ? parseDateOnlyToUtc(dataReferenciaRaw) : null;
  if (dataReferenciaRaw && !dataReferencia) {
    return NextResponse.json({ error: "Data da foto inválida" }, { status: 400 });
  }

  const ordem = Number(ordemRaw || "0");
  const ordemNormalizada = Number.isFinite(ordem) ? Math.max(0, ordem) : 0;

  let albumId: string | null = null;
  if (albumIdRaw) {
    const album = await db.albumFoto.findUnique({ where: { id: albumIdRaw }, select: { id: true } });
    if (!album) {
      return NextResponse.json({ error: "Álbum inválido" }, { status: 400 });
    }
    albumId = album.id;
  }

  // Valida tipo antes de salvar.
  if (!allowedTypes.includes(arquivo.type)) {
    return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  }

  // Salva em pasta dedicada de midia.
  const filepath = await uploadFile(arquivo, "midia");

  const midia = await db.midia.create({
    data: {
      titulo,
      descricao: descricao || null,
      dataReferencia,
      ordem: ordemNormalizada,
      albumId,
      caminho: filepath,
      tipo: arquivo.type,
      tamanho: arquivo.size
    }
  });

  // Auditoria do upload.
  await logAuditoria({
    acao: "UPLOAD",
    entidade: "midia",
    registroId: midia.id,
    usuarioId: session.user.id
  });

  return NextResponse.json(midia, { status: 201 });
}
