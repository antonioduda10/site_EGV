import { NextResponse } from "next/server";
import { noticiaSchema } from "@/lib/validators";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { Permissions } from "@/lib/permissions";
import { logAuditoria } from "@/lib/audit";
import { normalizeUploadAssetUrl, rewriteUploadUrlsInHtml } from "@/lib/content-url";
import { normalizeNewsCoverSize } from "@/lib/news-cover-size";

function slugify(text: string) {
  // Normaliza o titulo para gerar o slug publico.
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

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
  if (hasTag) return rewriteUploadUrlsInHtml(input);
  const escaped = escapeHtml(input).replace(/\r?\n/g, "<br />");
  return `<p>${escaped}</p>`;
}

export async function GET() {
  // Publica noticias agendadas quando chega a data.
  const now = new Date();
  await db.noticia.updateMany({
    where: { status: "AGENDADO", dataPublicacao: { lte: now } },
    data: { status: "PUBLICADO" }
  });

  const noticias = await db.noticia.findMany({
    orderBy: { dataCadastro: "desc" }
  });
  return NextResponse.json(noticias);
}

export async function POST(request: Request) {
  const { allowed, session } = await requirePermission(Permissions.NEWS_WRITE);
  if (!allowed || !session) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = noticiaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const slug = slugify(parsed.data.titulo);
  const noticia = await db.noticia.create({
    data: {
      titulo: parsed.data.titulo,
      resumo: parsed.data.resumo,
      conteudo: normalizeContent(parsed.data.conteudo),
      imagemCapa: normalizeUploadAssetUrl(parsed.data.imagemCapa) || null,
      imagemCapaTamanho: normalizeNewsCoverSize(parsed.data.imagemCapaTamanho),
      dataPublicacao: parsed.data.dataPublicacao ? new Date(parsed.data.dataPublicacao) : null,
      slug,
      status: "RASCUNHO",
      autorId: session.user.id
    }
  });

  await logAuditoria({
    acao: "CRIAR",
    entidade: "noticia",
    registroId: noticia.id,
    usuarioId: session.user.id
  });

  return NextResponse.json(noticia, { status: 201 });
}
