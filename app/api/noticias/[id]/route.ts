import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { noticiaSchema } from "@/lib/validators";
import { requirePermission } from "@/lib/require-permission";
import { Permissions } from "@/lib/permissions";
import { logAuditoria } from "@/lib/audit";
import { normalizeUploadAssetUrl } from "@/lib/content-url";
import { sanitizeRichHtml, sanitizeRichRecord } from "@/lib/sanitize-rich-html";
import { hasContentPermission, contentHeaders } from "@/lib/content-access";
import { isNewsPublic } from "@/lib/publication";
import { normalizeNewsCoverSize } from "@/lib/news-cover-size";
import { withApiErrors } from "@/lib/api-errors";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeContent(input: string) {
  const hasTag = /<\/?[a-z][\s\S]*>/i.test(input);
  if (hasTag) return sanitizeRichHtml(input);
  const escaped = escapeHtml(input).replace(/\r?\n/g, "<br />");
  return `<p>${escaped}</p>`;
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const noticia = await db.noticia.findUnique({ where: { id: params.id } });
  if (!noticia || (!isNewsPublic(noticia) && !await hasContentPermission(Permissions.NEWS_READ, Permissions.NEWS_WRITE, Permissions.NEWS_APPROVE))) {
    return NextResponse.json({ error: "Não encontrada" }, { status: 404 });
  }
  return NextResponse.json(sanitizeRichRecord(noticia), { headers: contentHeaders });
}

export const PATCH = withApiErrors(async (request: Request, { params }: { params: { id: string } }) => {
  const { allowed, session } = await requirePermission(Permissions.NEWS_WRITE);
  if (!allowed || !session) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = noticiaSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  // Permite alterar status apenas no fluxo de rascunho.
  const status = typeof body?.status === "string" ? body.status : undefined;
   if (status && status !== "RASCUNHO") {
     return NextResponse.json({ error: "Status inválido" }, { status: 400 });
   }

  const noticia = await db.noticia.update({
    where: { id: params.id },
    data: {
      ...parsed.data,
      conteudo: parsed.data.conteudo ? normalizeContent(parsed.data.conteudo) : undefined,
      imagemCapa: parsed.data.imagemCapa !== undefined ? normalizeUploadAssetUrl(parsed.data.imagemCapa) || null : undefined,
      imagemCapaTamanho:
        parsed.data.imagemCapaTamanho !== undefined ? normalizeNewsCoverSize(parsed.data.imagemCapaTamanho) : undefined,
      dataPublicacao: parsed.data.dataPublicacao
        ? new Date(parsed.data.dataPublicacao)
        : parsed.data.dataPublicacao === null
        ? null
        : undefined,
      status: status ?? undefined
    }
  });

  await logAuditoria({
    acao: "ATUALIZAR",
    entidade: "noticia",
    registroId: noticia.id,
    usuarioId: session.user.id
  });

  return NextResponse.json(noticia);
}, "noticias.editar");

export const DELETE = withApiErrors(async (_: Request, { params }: { params: { id: string } }) => {
  const { allowed, session } = await requirePermission(Permissions.NEWS_WRITE);
  if (!allowed || !session) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  await db.noticia.delete({ where: { id: params.id } });
  await logAuditoria({
    acao: "EXCLUIR",
    entidade: "noticia",
    registroId: params.id,
    usuarioId: session.user.id
  });

  return NextResponse.json({ ok: true });
}, "noticias.excluir");
