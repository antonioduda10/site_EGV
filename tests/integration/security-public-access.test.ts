import { beforeEach, describe, expect, it, vi } from "vitest";
import { getServerSession } from "next-auth";
import { GET as news, } from "@/app/api/noticias/route";
import { GET as newsDetail } from "@/app/api/noticias/[id]/route";
import { GET as pages } from "@/app/api/paginas/route";
import { GET as pageDetail } from "@/app/api/paginas/[id]/route";
import { GET as events } from "@/app/api/eventos/route";
import { GET as eventDetail } from "@/app/api/eventos/[id]/route";
import { GET as banners } from "@/app/api/banners/route";
import { GET as bannerDetail } from "@/app/api/banners/[id]/route";
import { GET as documents } from "@/app/api/documentos/route";
import { GET as secretaryDetail } from "@/app/api/secretaria/[id]/route";
import { hasContentPermission } from "@/lib/content-access";
import { Permissions } from "@/lib/permissions";
import { dbMock } from "../mocks/db";
import { params, testSession } from "../helpers";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
const request = new Request("http://localhost/api/conteudo");

beforeEach(() => {
  vi.mocked(getServerSession).mockResolvedValue(null);
  dbMock.noticia.updateMany.mockResolvedValue({ count: 0 });
  for (const model of [dbMock.noticia, dbMock.paginaInstitucional, dbMock.evento, dbMock.banner, dbMock.arquivoDocumento]) model.findMany.mockResolvedValue([]);
});

describe("AULA12 publicacao e autorizacao por modulo", () => {
  it("SEC-PUB-01 noticias publicas exigem PUBLICADO e data permitida", async () => {
    expect((await news()).status).toBe(200);
    expect(dbMock.noticia.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: "PUBLICADO", OR: [{ dataPublicacao: null }, { dataPublicacao: { lte: expect.any(Date) } }] } }));
  });
  it.each([
    ["paginas", pages, dbMock.paginaInstitucional, { visivel: true }],
    ["eventos", events, dbMock.evento, { status: "PUBLICADO" }],
    ["banners", banners, dbMock.banner, { ativo: true }],
    ["documentos", documents, dbMock.arquivoDocumento, { status: "ATIVO" }]
  ] as const)("SEC-PUB-02 visitante recebe apenas conteudo publico (%s)", async (_name, action, model, where) => {
    expect((await action()).status).toBe(200);
    expect(model.findMany).toHaveBeenCalledWith(expect.objectContaining({ where }));
  });
  const restricted = [
    ["rascunho", newsDetail, dbMock.noticia, { status: "RASCUNHO", conteudo: "<p>Conteudo interno</p>" }],
    ["agendado", newsDetail, dbMock.noticia, { status: "PUBLICADO", dataPublicacao: new Date(Date.now() + 86400000), conteudo: "<p>Conteudo futuro</p>" }],
    ["pagina invisivel", pageDetail, dbMock.paginaInstitucional, { visivel: false, conteudo: "<p>Conteudo interno</p>" }],
    ["evento rascunho", eventDetail, dbMock.evento, { status: "RASCUNHO", conteudo: "<p>Conteudo interno</p>" }],
    ["banner inativo", bannerDetail, dbMock.banner, { ativo: false }],
    ["servidor inativo", secretaryDetail, dbMock.secretariaServidor, { ativo: false }]
  ] as const;
  it.each(restricted)("SEC-PUB-03 ID restrito nao e publico (%s)", async (_name, action, model, record) => {
    model.findUnique.mockResolvedValue(record);
    expect((await action(request, params)).status).toBe(404);
  });
  it.each(restricted)("SEC-PUB-04 administrador autorizado mantem acesso (%s)", async (_name, action, model, record) => {
    vi.mocked(getServerSession).mockResolvedValue(testSession);
    model.findUnique.mockResolvedValue(record);
    expect((await action(request, params)).status).toBe(200);
  });
  it("SEC-PUB-05 sessao sem permissao do modulo nao abre pagina invisivel", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ ...testSession, user: { ...testSession.user, roles: ["Docente"] } });
    dbMock.paginaInstitucional.findUnique.mockResolvedValue({ visivel: false });
    expect((await pageDetail(request, params)).status).toBe(404);
  });
  it("SEC-PUB-06 PUBLICADO permanece acessivel e HTML antigo e sanitizado", async () => {
    dbMock.noticia.findUnique.mockResolvedValue({ status: "PUBLICADO", conteudo: '<p>Legitimo</p><img src="x" onerror="alert(1)"><script>alert(1)</script>' });
    const response = await newsDetail(request, params);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.conteudo).toContain("Legitimo");
    expect(json.conteudo).not.toMatch(/onerror|<script/);
  });
  it("SEC-PUB-07 sessao invalidada nao concede acesso mesmo com roles residuais", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ ...testSession, invalidated: true });
    expect(await hasContentPermission(Permissions.PAGES_WRITE)).toBe(false);
  });
});
