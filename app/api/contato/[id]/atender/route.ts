import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { Permissions } from "@/lib/permissions";
import { logAuditoria } from "@/lib/audit";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const { allowed, session } = await requirePermission(Permissions.CONTACTS_WRITE);
  if (!allowed || !session) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  await db.sugestaoContato.update({
    where: { id: params.id },
    data: { statusAtendimento: "RESOLVIDO" }
  });

  await logAuditoria({
    acao: "ATENDER",
    entidade: "contato",
    registroId: params.id,
    usuarioId: session.user.id
  });

  return NextResponse.json({ ok: true });
}
