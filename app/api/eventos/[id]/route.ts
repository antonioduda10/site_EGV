import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eventoSchema } from "@/lib/validators";
import { requirePermission } from "@/lib/require-permission";
import { Permissions } from "@/lib/permissions";
import { logAuditoria } from "@/lib/audit";
import { rewriteUploadUrlsInHtml } from "@/lib/content-url";
import { compactEventoOrdens, normalizeEventOrderValue, reorderEventosByPosition } from "@/lib/event-order";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const evento = await db.evento.findUnique({ where: { id: params.id } });
  if (!evento) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }
  return NextResponse.json(evento);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { allowed, session } = await requirePermission(Permissions.EVENTS_WRITE);
  if (!allowed || !session) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = eventoSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  // Valida status permitido para evento.
  const status = typeof body?.status === "string" ? body.status : undefined;
  if (status && !["PUBLICADO", "RASCUNHO"].includes(status)) {
    return NextResponse.json({ error: "Status inválido" }, { status: 400 });
  }

  const hasOrderChange = parsed.data.ordem !== undefined;
  const ordemDesejada = hasOrderChange ? normalizeEventOrderValue(parsed.data.ordem) : undefined;

  const evento = await db.evento.update({
    where: { id: params.id },
    data: {
      ...parsed.data,
      conteudo: parsed.data.conteudo !== undefined ? rewriteUploadUrlsInHtml(parsed.data.conteudo) : undefined,
      dataInicio: parsed.data.dataInicio ? new Date(parsed.data.dataInicio) : undefined,
      dataFim: parsed.data.dataFim ? new Date(parsed.data.dataFim) : undefined,
      status: status ?? undefined,
      ordem: ordemDesejada
    }
  });

  if (ordemDesejada !== undefined) {
    await reorderEventosByPosition(evento.id, ordemDesejada);
  }

  const eventoAtualizado = ordemDesejada !== undefined
    ? await db.evento.findUnique({ where: { id: evento.id } })
    : evento;

  await logAuditoria({
    acao: "ATUALIZAR",
    entidade: "evento",
    registroId: evento.id,
    usuarioId: session.user.id
  });

  return NextResponse.json(eventoAtualizado ?? evento);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const { allowed, session } = await requirePermission(Permissions.EVENTS_WRITE);
  if (!allowed || !session) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  await db.evento.delete({ where: { id: params.id } });
  await compactEventoOrdens();
  await logAuditoria({
    acao: "EXCLUIR",
    entidade: "evento",
    registroId: params.id,
    usuarioId: session.user.id
  });

  return NextResponse.json({ ok: true });
}
