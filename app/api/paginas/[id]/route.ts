import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { paginaSchema } from "@/lib/validators";
import { requirePermission } from "@/lib/require-permission";
import { Permissions } from "@/lib/permissions";
import { logAuditoria } from "@/lib/audit";
import { rewriteUploadUrlsInHtml } from "@/lib/content-url";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeContent(input: string) {
  // Mantem HTML recebido; se for texto puro, converte para paragrafo.
  const hasTag = /<\/?[a-z][\s\S]*>/i.test(input);
  if (hasTag) return rewriteUploadUrlsInHtml(input);
  const escaped = escapeHtml(input).replace(/\r?\n/g, "<br />");
  return `<p>${escaped}</p>`;
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const pagina = await db.paginaInstitucional.findUnique({ where: { id: params.id } });
  if (!pagina) {
    return NextResponse.json({ error: "Não encontrada" }, { status: 404 });
  }
  return NextResponse.json(pagina);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { allowed, session } = await requirePermission(Permissions.PAGES_WRITE);
  if (!allowed || !session) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = paginaSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const visivel = typeof body?.visivel === "boolean" ? body.visivel : undefined;
  const ordem = typeof body?.ordem === "number" ? body.ordem : undefined;

  const pagina = await db.paginaInstitucional.update({
    where: { id: params.id },
    data: {
      ...parsed.data,
      conteudo: parsed.data.conteudo ? normalizeContent(parsed.data.conteudo) : undefined,
      visivel,
      ordem
    }
  });

  await logAuditoria({
    acao: "ATUALIZAR",
    entidade: "pagina",
    registroId: pagina.id,
    usuarioId: session.user.id
  });

  return NextResponse.json(pagina);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const { allowed, session } = await requirePermission(Permissions.PAGES_WRITE);
  if (!allowed || !session) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  await db.paginaInstitucional.delete({ where: { id: params.id } });

  await logAuditoria({
    acao: "EXCLUIR",
    entidade: "pagina",
    registroId: params.id,
    usuarioId: session.user.id
  });
  return NextResponse.json({ ok: true });
}
