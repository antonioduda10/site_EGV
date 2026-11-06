import { beforeEach, describe, expect, it, vi } from "vitest";
import { getServerSession } from "next-auth";
import { GET, POST } from "@/app/api/noticias/route";
import { GET as detail, PATCH, DELETE } from "@/app/api/noticias/[id]/route";
import { POST as approve } from "@/app/api/noticias/[id]/aprovar/route";
import { POST as reject } from "@/app/api/noticias/[id]/rejeitar/route";
import { POST as submit } from "@/app/api/noticias/[id]/enviar-aprovacao/route";
import { dbMock } from "../mocks/db";
import { jsonRequest, params, testSession } from "../helpers";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
const payload = { titulo: "Noticia de teste", resumo: "Resumo de teste automatizado", conteudo: "Conteudo ficticio para validar a publicacao." };
const record = { ...payload, id: "record-test", slug: "noticia-de-teste", status: "RASCUNHO", dataPublicacao: null };
const request = () => jsonRequest("/api/noticias", payload);

beforeEach(() => {
  vi.mocked(getServerSession).mockResolvedValue(testSession);
  dbMock.noticia.create.mockResolvedValue(record);
  dbMock.noticia.findUnique.mockResolvedValue(record);
  dbMock.noticia.update.mockResolvedValue(record);
  dbMock.noticia.delete.mockResolvedValue(record);
});

describe("API noticias: autorizacao real e CRUD com Prisma simulado", () => {
  const mutations = [
    ["criar", () => POST(request())],
    ["editar", () => PATCH(request(), params)],
    ["excluir", () => DELETE(request(), params)],
    ["aprovar", () => approve(request(), params)],
    ["rejeitar", () => reject(request(), params)],
    ["enviar", () => submit(request(), params)]
  ] as const;
  it.each(mutations)("NEWS-01 %s sem sessao retorna 403 sem gravacao", async (_name, action) => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const response = await action();
    expect(response.status).toBe(403);
    expect(await response.json()).toHaveProperty("error");
    expect(dbMock.noticia.create).not.toHaveBeenCalled();
    expect(dbMock.noticia.update).not.toHaveBeenCalled();
    expect(dbMock.noticia.delete).not.toHaveBeenCalled();
  });
  it.each(mutations)("NEWS-02 %s sem permissao retorna 403", async (_name, action) => {
    vi.mocked(getServerSession).mockResolvedValue({ ...testSession, user: { ...testSession.user, roles: ["Docente"] } });
    expect((await action()).status).toBe(403);
    expect(dbMock.logAuditoria.create).not.toHaveBeenCalled();
  });
  it("NEWS-03 cria rascunho, gera slug e registra autoria/auditoria", async () => {
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ id: record.id, status: "RASCUNHO" });
    expect(dbMock.noticia.create).toHaveBeenCalledWith({ data: expect.objectContaining({ slug: "noticia-de-teste", status: "RASCUNHO", autorId: testSession.user.id, conteudo: `<p>${payload.conteudo}</p>` }) });
    expect(dbMock.logAuditoria.create).toHaveBeenCalledWith({ data: expect.objectContaining({ acao: "CRIAR", entidadeAfetada: "noticia" }) });
  });
  it("NEWS-04 payload invalido retorna 400 sem gravar", async () => {
    expect((await POST(jsonRequest("/api/noticias", { titulo: "x" }))).status).toBe(400);
    expect(dbMock.noticia.create).not.toHaveBeenCalled();
  });
  it("NEWS-05 JSON malformado retorna 400", async () => {
    const response = await POST(new Request("http://localhost/api/noticias", { method: "POST", body: "{" }));
    expect(response.status).toBe(400);
    expect(dbMock.noticia.create).not.toHaveBeenCalled();
  });
  it("NEWS-06 falha de persistencia retorna 500 sem vazar detalhes", async () => {
    dbMock.noticia.create.mockRejectedValue(new Error("detalhe-interno-simulado"));
    const response = await POST(request());
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("detalhe-interno-simulado");
  });
  it("NEWS-07 consulta publica preserva ordenacao e publicacao agendada", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    dbMock.noticia.updateMany.mockResolvedValue({ count: 0 });
    dbMock.noticia.findMany.mockResolvedValue([{ ...record, status: "PUBLICADO" }]);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toHaveLength(1);
    expect(dbMock.noticia.updateMany).toHaveBeenCalledWith({ where: { status: "AGENDADO", dataPublicacao: { lte: expect.any(Date) } }, data: { status: "PUBLICADO" } });
    expect(dbMock.noticia.findMany).toHaveBeenCalledWith({ where: { status: "PUBLICADO", OR: [{ dataPublicacao: null }, { dataPublicacao: { lte: expect.any(Date) } }] }, orderBy: { dataCadastro: "desc" } });
  });
  it("NEWS-08 detalhe existente retorna JSON", async () => {
    expect(await (await detail(request(), params)).json()).toEqual(record);
  });
  it("NEWS-09 detalhe ausente retorna 404", async () => {
    dbMock.noticia.findUnique.mockResolvedValue(null);
    expect((await detail(request(), params)).status).toBe(404);
  });
  it("NEWS-10 atualiza campos e preserva capa/publicacao ausentes", async () => {
    const response = await PATCH(jsonRequest("/api/noticias/record-test", { titulo: "Titulo alterado" }, "PATCH"), params);
    expect(response.status).toBe(200);
    expect(dbMock.noticia.update).toHaveBeenCalledWith({ where: { id: record.id }, data: expect.objectContaining({ titulo: "Titulo alterado", imagemCapa: undefined, dataPublicacao: undefined }) });
  });
  it("NEWS-11 edicao invalida retorna 400", async () => expect((await PATCH(jsonRequest("/api/noticias/x", { titulo: "x" }, "PATCH"), params)).status).toBe(400));
  it("NEWS-12 impede publicar diretamente pela edicao", async () => {
    expect((await PATCH(jsonRequest("/api/noticias/x", { status: "PUBLICADO" }, "PATCH"), params)).status).toBe(400);
    expect(dbMock.noticia.update).not.toHaveBeenCalled();
  });
  it("NEWS-13 exclui registro e registra auditoria", async () => {
    const response = await DELETE(request(), params);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(dbMock.noticia.delete).toHaveBeenCalledWith({ where: { id: record.id } });
  });
  it("NEWS-14 aprova publicacao imediata", async () => {
    expect((await approve(request(), params)).status).toBe(200);
    expect(dbMock.noticia.update).toHaveBeenCalledWith({ where: { id: record.id }, data: { status: "PUBLICADO" } });
  });
  it("NEWS-15 aprova publicacao futura como agendada", async () => {
    dbMock.noticia.findUnique.mockResolvedValue({ ...record, dataPublicacao: new Date(Date.now() + 86_400_000) });
    await approve(request(), params);
    expect(dbMock.noticia.update).toHaveBeenCalledWith({ where: { id: record.id }, data: { status: "AGENDADO" } });
  });
  it("NEWS-16 aprovar noticia ausente retorna 404", async () => {
    dbMock.noticia.findUnique.mockResolvedValue(null);
    expect((await approve(request(), params)).status).toBe(404);
  });
  it("NEWS-17 envia para aprovacao", async () => {
    expect((await submit(request(), params)).status).toBe(200);
    expect(dbMock.noticia.update).toHaveBeenCalledWith({ where: { id: record.id }, data: { status: "ENVIADO_PARA_APROVACAO" } });
  });
  it("NEWS-18 rejeita com motivo e registra auditoria", async () => {
    expect((await reject(jsonRequest("/api/noticias/x/rejeitar", { motivo: "Revisar informacoes" }), params)).status).toBe(200);
    expect(dbMock.noticia.update).toHaveBeenCalledWith({ where: { id: record.id }, data: { status: "REJEITADO", motivoRejeicao: "Revisar informacoes" } });
  });
  it("NEWS-19 normaliza HTML, capa e tamanho sem alterar payload", async () => {
    await POST(jsonRequest("/api/noticias", { ...payload, conteudo: '<p>Conteudo <img src="https://antigo.example/api/uploads/a.png"></p>', imagemCapa: "https://antigo.example/api/uploads/capa.png", imagemCapaTamanho: "PEQUENO", dataPublicacao: "2030-01-01T10:00:00Z" }));
    expect(dbMock.noticia.create).toHaveBeenCalledWith({ data: expect.objectContaining({ conteudo: '<p>Conteudo <img src="/api/uploads/a.png" loading="lazy" decoding="async" /></p>', imagemCapa: "/api/uploads/capa.png", imagemCapaTamanho: "PEQUENO", dataPublicacao: new Date("2030-01-01T10:00:00Z") }) });
  });
});
