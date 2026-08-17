import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { Permissions } from "@/lib/permissions";
import { logAuditoria } from "@/lib/audit";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const { allowed, session } = await requirePermission(Permissions.NEWS_APPROVE);
  if (!allowed || !session) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const noticia = await db.noticia.findUnique({ where: { id: params.id } });
  if (!noticia) {
    return NextResponse.json({ error: "Não encontrada" }, { status: 404 });
  }

  // Define publicado imediato ou agendado conforme data.
  const status = noticia.dataPublicacao && noticia.dataPublicacao > new Date() ? "AGENDADO" : "PUBLICADO";
  await db.noticia.update({
    where: { id: params.id },
    data: { status }
  });

  await logAuditoria({
    acao: "APROVAR",
    entidade: "noticia",
    registroId: params.id,
    usuarioId: session.user.id
  });

  return NextResponse.json({ ok: true });
}
