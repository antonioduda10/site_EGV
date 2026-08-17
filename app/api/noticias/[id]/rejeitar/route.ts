import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { Permissions } from "@/lib/permissions";
import { logAuditoria } from "@/lib/audit";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { allowed, session } = await requirePermission(Permissions.NEWS_APPROVE);
  if (!allowed || !session) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  // Registra o motivo da rejeicao para auditoria.
  const { motivo } = await request.json().catch(() => ({ motivo: null }));

  await db.noticia.update({
    where: { id: params.id },
    data: { status: "REJEITADO", motivoRejeicao: motivo ?? "" }
  });

  await logAuditoria({
    acao: "REJEITAR",
    entidade: "noticia",
    registroId: params.id,
    usuarioId: session.user.id,
    detalhes: { motivo }
  });

  return NextResponse.json({ ok: true });
}
