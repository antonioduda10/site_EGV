import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import sitemap, { dynamic, runtime } from "@/app/sitemap";
import robots from "@/app/robots";
import { createPublicMetadata, PUBLIC_SITE_URL } from "@/lib/seo";
import { dbMock } from "../mocks/db";

const publicPaths = [
  "/", "/noticias", "/eventos", "/documentos", "/galeria",
  "/galeria/fotos", "/galeria/videos", "/secretaria", "/contato",
  "/politica-privacidade", "/cookies", "/termos"
];

beforeEach(() => {
  dbMock.noticia.findMany.mockResolvedValue([]);
  dbMock.paginaInstitucional.findMany.mockResolvedValue([]);
  dbMock.evento.findMany.mockResolvedValue([]);
});

afterEach(() => vi.unstubAllEnvs());

describe("SEO publico e exclusao de rotas privadas", () => {
  it("SEO-01 inclui somente as paginas publicas reais, sem alias ou datas inventadas", async () => {
    const entries = await sitemap();
    expect(entries.map((entry) => entry.url)).toEqual(publicPaths.map((path) => new URL(path, PUBLIC_SITE_URL).toString()));
    expect(new Set(entries.map((entry) => entry.url)).size).toBe(entries.length);
    for (const entry of entries) expect(entry).not.toHaveProperty("lastModified");
    expect(dynamic).toBe("force-dynamic");
    expect(runtime).toBe("nodejs");
  });

  it("SEO-02 consulta somente publicacoes atuais, paginas visiveis e eventos publicados", async () => {
    await sitemap();
    expect(dbMock.noticia.findMany).toHaveBeenCalledWith({
      where: { status: "PUBLICADO", OR: [{ dataPublicacao: null }, { dataPublicacao: { lte: expect.any(Date) } }] },
      select: { slug: true, dataPublicacao: true, dataCadastro: true }, orderBy: { slug: "asc" }
    });
    expect(dbMock.paginaInstitucional.findMany).toHaveBeenCalledWith({ where: { visivel: true }, select: { slug: true }, orderBy: { slug: "asc" } });
    expect(dbMock.evento.findMany).toHaveBeenCalledWith({ where: { status: "PUBLICADO" }, select: { id: true }, orderBy: { id: "asc" } });
    expect(dbMock.usuario.findMany).not.toHaveBeenCalled();
  });

  it("SEO-03 inclui detalhes dinamicos com segmentos codificados e lastmod confiavel de noticias", async () => {
    const created = new Date("2026-01-01T12:00:00Z");
    const published = new Date("2026-02-01T12:00:00Z");
    dbMock.noticia.findMany.mockResolvedValue([
      { slug: "noticia-publicada", dataPublicacao: published, dataCadastro: created },
      { slug: "noticia-sem-data", dataPublicacao: null, dataCadastro: created }
    ]);
    dbMock.paginaInstitucional.findMany.mockResolvedValue([{ slug: "pagina com acento e /?#" }]);
    dbMock.evento.findMany.mockResolvedValue([{ id: "evento-publicado" }]);
    const entries = await sitemap();
    expect(entries.slice(publicPaths.length)).toEqual([
      { url: `${PUBLIC_SITE_URL}/noticias/noticia-publicada`, lastModified: published },
      { url: `${PUBLIC_SITE_URL}/noticias/noticia-sem-data`, lastModified: created },
      { url: `${PUBLIC_SITE_URL}/p/pagina%20com%20acento%20e%20%2F%3F%23` },
      { url: `${PUBLIC_SITE_URL}/eventos/evento-publicado` }
    ]);
  });

  it("SEO-04 reflete novas publicacoes na proxima consulta sem reconstruir o site", async () => {
    expect(await sitemap()).toHaveLength(publicPaths.length);
    dbMock.paginaInstitucional.findMany.mockResolvedValue([{ slug: "nova-pagina-publica" }]);
    expect(await sitemap()).toContainEqual({ url: `${PUBLIC_SITE_URL}/p/nova-pagina-publica` });
    expect(dbMock.paginaInstitucional.findMany).toHaveBeenCalledTimes(2);
  });

  it("SEO-05 nao mascara falha do banco com um sitemap parcial aparentemente valido", async () => {
    dbMock.noticia.findMany.mockRejectedValue(new Error("Banco indisponivel"));
    await expect(sitemap()).rejects.toThrow("Banco indisponivel");
  });

  it("SEO-06 robots anuncia o sitemap e bloqueia administracao, autenticacao e APIs", () => {
    expect(robots()).toEqual({
      rules: { userAgent: "*", allow: ["/", "/api/uploads/"], disallow: ["/dashboard", "/login", "/recuperar", "/api/"] },
      sitemap: `${PUBLIC_SITE_URL}/sitemap.xml`
    });
  });

  it("SEO-07 canonical e Open Graph usam HTTPS sem www, independente da origem de autenticacao", () => {
    vi.stubEnv("NEXTAUTH_URL", "http://localhost:3000");
    const metadata = createPublicMetadata({ title: "Noticias", path: "/noticias", description: "Informacoes publicas." });
    expect(metadata.alternates?.canonical).toBe(`${PUBLIC_SITE_URL}/noticias`);
    expect(metadata.openGraph).toMatchObject({ url: `${PUBLIC_SITE_URL}/noticias` });
    expect(metadata.robots).toBeUndefined();
    expect(metadata.description).toBe("Informacoes publicas.");
  });
});
