import { NextResponse } from "next/server";
import { eventoSchema } from "@/lib/validators";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { Permissions } from "@/lib/permissions";
import { logAuditoria } from "@/lib/audit";
import { rewriteUploadUrlsInHtml } from "@/lib/content-url";
import { normalizeEventOrderValue, reorderEventosByPosition } from "@/lib/event-order";

export async function GET() {
  // Lista eventos em ordem cronologica.
  const eventos = await db.evento.findMany({
    orderBy: [{ ordem: "asc" }, { dataInicio: "asc" }]
  });
  return NextResponse.json(eventos);
}

export async function POST(request: Request) {
  const { allowed, session } = await requirePermission(Permissions.EVENTS_WRITE);
  if (!allowed || !session) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = eventoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const ordemDesejada = normalizeEventOrderValue(parsed.data.ordem);

  // Cria evento publicado por padrao.
  const evento = await db.evento.create({
    data: {
      titulo: parsed.data.titulo,
      descricao: parsed.data.descricao,
      conteudo: rewriteUploadUrlsInHtml(parsed.data.conteudo),
      dataInicio: new Date(parsed.data.dataInicio),
      dataFim: parsed.data.dataFim ? new Date(parsed.data.dataFim) : null,
      local: parsed.data.local,
      ordem: ordemDesejada,
      status: "PUBLICADO"
    }
  });

  await reorderEventosByPosition(evento.id, ordemDesejada);
  const eventoOrdenado = await db.evento.findUnique({ where: { id: evento.id } });

  await logAuditoria({
    acao: "CRIAR",
    entidade: "evento",
    registroId: evento.id,
    usuarioId: session.user.id
  });

  return NextResponse.json(eventoOrdenado ?? evento, { status: 201 });
}
