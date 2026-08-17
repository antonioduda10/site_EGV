import { NextResponse } from "next/server";
import { StatusSugestao } from "@prisma/client";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { Permissions } from "@/lib/permissions";
import { logAuditoria } from "@/lib/audit";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { allowed, session } = await requirePermission(Permissions.CONTACTS_WRITE);
  if (!allowed || !session) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const statusRaw = String(body?.statusAtendimento ?? "").toUpperCase();
  const statusPermitidos = Object.values(StatusSugestao);
  if (!statusRaw || !statusPermitidos.includes(statusRaw as StatusSugestao)) {
    return NextResponse.json({ error: "Status inválido" }, { status: 400 });
  }
  const statusAtendimento = statusRaw as StatusSugestao;

  const contato = await db.sugestaoContato.update({
    where: { id: params.id },
    data: { statusAtendimento }
  });

  await logAuditoria({
    acao: "ATUALIZAR",
    entidade: "contato",
    registroId: contato.id,
    usuarioId: session.user.id
  });

  return NextResponse.json(contato);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const { allowed, session } = await requirePermission(Permissions.CONTACTS_WRITE);
  if (!allowed || !session) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  await db.sugestaoContato.delete({ where: { id: params.id } });

  await logAuditoria({
    acao: "EXCLUIR",
    entidade: "contato",
    registroId: params.id,
    usuarioId: session.user.id
  });

  return NextResponse.json({ ok: true });
}
