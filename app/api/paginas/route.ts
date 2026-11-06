import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { paginaSchema } from "@/lib/validators";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/require-permission";
import { Permissions } from "@/lib/permissions";
import { logAuditoria } from "@/lib/audit";
import { sanitizeRichHtml, sanitizeRichRecord } from "@/lib/sanitize-rich-html";
import { hasContentPermission, contentHeaders } from "@/lib/content-access";

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
  if (hasTag) return sanitizeRichHtml(input);
  const escaped = escapeHtml(input).replace(/\r?\n/g, "<br />");
  return `<p>${escaped}</p>`;
}

export async function GET() {
  const paginas = await db.paginaInstitucional.findMany({ where: await hasContentPermission(Permissions.PAGES_WRITE) ? undefined : { visivel: true }, orderBy: { ordem: "asc" } });
  return NextResponse.json(paginas.map(sanitizeRichRecord), { headers: contentHeaders });
}

export async function POST(request: Request) {
  const { allowed, session } = await requirePermission(Permissions.PAGES_WRITE);
  if (!allowed || !session) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = paginaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  try {
    const pagina = await db.paginaInstitucional.create({
      data: {
        ...parsed.data,
        conteudo: normalizeContent(parsed.data.conteudo),
        visivel: true,
        ordem: 0
      }
    });

    await logAuditoria({
      acao: "CRIAR",
      entidade: "pagina",
      registroId: pagina.id,
      usuarioId: session.user.id
    });

    return NextResponse.json(pagina, { status: 201 });
  } catch (error) {
    const message = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "";
    if (message === "P2002") {
      // Slug unico: evita duplicidade de paginas com o mesmo endereco.
      return NextResponse.json({ error: "Slug ja existe. Use outro." }, { status: 409 });
    }
    console.error("Erro interno ao salvar pagina.");
    return NextResponse.json({ error: "Erro ao salvar pagina" }, { status: 500 });
  }
}
