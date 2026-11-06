import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { publicNewsWhere } from "@/lib/publication";
import { PUBLIC_SITE_URL } from "@/lib/seo";

// Publication changes must not leave restricted content in a cached sitemap.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [noticias, paginas, eventos] = await Promise.all([
    db.noticia.findMany({
      where: publicNewsWhere(),
      select: { slug: true, dataPublicacao: true, dataCadastro: true },
      orderBy: { slug: "asc" }
    }),
    db.paginaInstitucional.findMany({
      where: { visivel: true },
      select: { slug: true },
      orderBy: { slug: "asc" }
    }),
    db.evento.findMany({
      where: { status: "PUBLICADO" },
      select: { id: true },
      orderBy: { id: "asc" }
    })
  ]);

  const publicPaths = [
    "/", "/noticias", "/eventos", "/documentos", "/galeria",
    "/galeria/fotos", "/galeria/videos", "/secretaria", "/contato",
    "/politica-privacidade", "/cookies", "/termos"
  ];

  return [
    ...publicPaths.map((path) => ({ url: new URL(path, PUBLIC_SITE_URL).toString() })),
    ...noticias.map((noticia) => ({
      url: `${PUBLIC_SITE_URL}/noticias/${encodeURIComponent(noticia.slug)}`,
      lastModified: noticia.dataPublicacao ?? noticia.dataCadastro
    })),
    ...paginas.map((pagina) => ({ url: `${PUBLIC_SITE_URL}/p/${encodeURIComponent(pagina.slug)}` })),
    ...eventos.map((evento) => ({ url: `${PUBLIC_SITE_URL}/eventos/${encodeURIComponent(evento.id)}` }))
  ];
}
