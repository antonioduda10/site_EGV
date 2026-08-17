import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { Permissions } from "@/lib/permissions";
import { logAuditoria } from "@/lib/audit";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const { allowed, session } = await requirePermission(Permissions.NEWS_WRITE);
  if (!allowed || !session) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  // Envia noticia para fluxo de aprovacao.
  const noticia = await db.noticia.update({
    where: { id: params.id },
    data: { status: "ENVIADO_PARA_APROVACAO" }
  });

  await logAuditoria({
    acao: "ENVIAR_APROVACAO",
    entidade: "noticia",
    registroId: noticia.id,
    usuarioId: session.user.id
  });

  return NextResponse.json({ ok: true });
}
