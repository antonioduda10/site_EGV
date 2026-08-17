import { NextResponse } from "next/server";
import { StatusDocumento } from "@prisma/client";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { Permissions } from "@/lib/permissions";
import { deleteFile } from "@/lib/uploads";
import { logAuditoria } from "@/lib/audit";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  // Atualizacao exige permissao de documentos.
  const { allowed, session } = await requirePermission(Permissions.DOCS_WRITE);
  if (!allowed || !session) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const doc = await db.arquivoDocumento.findUnique({ where: { id: params.id } });
  if (!doc) {
    return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
  }

  // JSON pode vir parcial; usa fallback seguro.
  const body = await request.json().catch(() => ({}));
  const nome = String(body?.nome ?? "").trim();
  const categoria = String(body?.categoria ?? "").trim();
  const ano = Number(body?.ano ?? 0);
  const descricao = String(body?.descricao ?? "");
  const statusRaw = String(body?.status ?? doc.status).toUpperCase();
  const ordem = Number(body?.ordem ?? doc.ordem ?? 0);

  if (!nome || !categoria || !ano) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const statusPermitidos = Object.values(StatusDocumento);
  if (!statusPermitidos.includes(statusRaw as StatusDocumento)) {
    return NextResponse.json({ error: "Status inválido" }, { status: 400 });
  }
  const status = statusRaw as StatusDocumento;

  // Mantem ordem e dados basicos do documento.
  const updated = await db.arquivoDocumento.update({
    where: { id: params.id },
    data: {
      nome,
      categoria,
      ano,
      descricao,
      status,
      ordem: Number.isFinite(ordem) ? ordem : doc.ordem
    }
  });

  // Registra auditoria da alteracao.
  await logAuditoria({
    acao: "ATUALIZAR",
    entidade: "documento",
    registroId: updated.id,
    usuarioId: session.user.id
  });

  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  // Exclusao exige permissao de documentos.
  const { allowed, session } = await requirePermission(Permissions.DOCS_WRITE);
  if (!allowed || !session) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const doc = await db.arquivoDocumento.findUnique({ where: { id: params.id } });
  if (!doc) {
    return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
  }

  // Remove arquivo fisico antes de apagar o registro.
  await deleteFile(doc.caminho);
  await db.arquivoDocumento.delete({ where: { id: params.id } });

  // Registra auditoria da exclusao.
  await logAuditoria({
    acao: "EXCLUIR",
    entidade: "documento",
    registroId: doc.id,
    usuarioId: session.user.id
  });

  return NextResponse.json({ ok: true });
}
