import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  const [noticias, paginas, documentos] = await Promise.all([
    db.noticia.findMany({
      where: { status: "PUBLICADO", OR: [{ titulo: { contains: q, mode: "insensitive" } }, { conteudo: { contains: q, mode: "insensitive" } }] },
      take: 5
    }),
    db.paginaInstitucional.findMany({
      where: { visivel: true, OR: [{ titulo: { contains: q, mode: "insensitive" } }, { conteudo: { contains: q, mode: "insensitive" } }] },
      take: 5
    }),
    db.arquivoDocumento.findMany({
      where: { status: "ATIVO", OR: [{ nome: { contains: q, mode: "insensitive" } }, { descricao: { contains: q, mode: "insensitive" } }] },
      take: 5
    })
  ]);

  return NextResponse.json({ noticias, paginas, documentos });
}
