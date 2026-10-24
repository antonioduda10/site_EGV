import { beforeEach, describe, expect, it, vi } from "vitest";
import { getServerSession } from "next-auth";
import { GET, POST } from "@/app/api/documentos/route";
import { PATCH, DELETE } from "@/app/api/documentos/[id]/route";
import { uploadFile, deleteFile } from "@/lib/uploads";
import { dbMock } from "../mocks/db";
import { jsonRequest, params, testSession } from "../helpers";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/uploads", () => ({ uploadFile: vi.fn(), deleteFile: vi.fn() }));
const record = { id: "record-test", nome: "Edital de teste", categoria: "Editais", ano: 2026, descricao: "Documento ficticio", status: "ATIVO", ordem: 0, versao: 1, caminho: "/api/uploads/documentos/teste.pdf" };
const metadata = { nome: record.nome, categoria: record.categoria, ano: record.ano, descricao: record.descricao };

function uploadRequest(type = "application/pdf", includeFile = true) {
  const form = new FormData();
  for (const [key, value] of Object.entries(metadata)) form.set(key, String(value));
  form.set("ordem", "2");
  if (includeFile) form.set("arquivo", new File(["%PDF-1.4 teste"], "teste.pdf", { type }));
  return new Request("http://localhost/api/documentos", { method: "POST", body: form });
}

beforeEach(() => {
  vi.mocked(getServerSession).mockResolvedValue(testSession);
  vi.mocked(uploadFile).mockResolvedValue(record.caminho);
  vi.mocked(deleteFile).mockResolvedValue(undefined);
  dbMock.arquivoDocumento.findUnique.mockResolvedValue(record);
  dbMock.arquivoDocumento.findFirst.mockResolvedValue(null);
  dbMock.arquivoDocumento.create.mockResolvedValue(record);
  dbMock.arquivoDocumento.update.mockResolvedValue(record);
  dbMock.arquivoDocumento.delete.mockResolvedValue(record);
});

describe("API documentos: CRUD e uploads isolados", () => {
  const mutations = [
    ["upload", () => POST(uploadRequest())],
    ["editar", () => PATCH(jsonRequest("/api/documentos/x", metadata, "PATCH"), params)],
    ["excluir", () => DELETE(jsonRequest("/api/documentos/x", {}, "DELETE"), params)]
  ] as const;
  it.each(mutations)("DOC-01 %s sem sessao retorna 403", async (_name, action) => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    expect((await action()).status).toBe(403);
    expect(uploadFile).not.toHaveBeenCalled();
    expect(deleteFile).not.toHaveBeenCalled();
    expect(dbMock.arquivoDocumento.create).not.toHaveBeenCalled();
    expect(dbMock.arquivoDocumento.update).not.toHaveBeenCalled();
    expect(dbMock.arquivoDocumento.delete).not.toHaveBeenCalled();
  });
  it.each(mutations)("DOC-02 %s sem permissao retorna 403", async (_name, action) => {
    vi.mocked(getServerSession).mockResolvedValue({ ...testSession, user: { ...testSession.user, roles: ["Docente"] } });
    expect((await action()).status).toBe(403);
    expect(dbMock.logAuditoria.create).not.toHaveBeenCalled();
  });
  it("DOC-03 consulta publica ordenada retorna JSON", async () => {
    dbMock.arquivoDocumento.findMany.mockResolvedValue([record]);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([record]);
    expect(dbMock.arquivoDocumento.findMany).toHaveBeenCalledWith({ orderBy: [{ ordem: "asc" }, { dataUpload: "desc" }] });
  });
  it("DOC-04 upload valido cria primeira versao e auditoria", async () => {
    const response = await POST(uploadRequest());
    expect(response.status).toBe(201);
    expect(await response.json()).toHaveProperty("id", record.id);
    expect(uploadFile).toHaveBeenCalledWith(expect.any(File), "documentos");
    expect(dbMock.arquivoDocumento.create).toHaveBeenCalledWith({ data: expect.objectContaining({ ...metadata, ordem: 2, caminho: record.caminho, versao: 1, status: "ATIVO" }) });
    expect(dbMock.logAuditoria.create).toHaveBeenCalledWith({ data: expect.objectContaining({ acao: "UPLOAD" }) });
  });
  it("DOC-05 novo upload incrementa versao anterior", async () => {
    dbMock.arquivoDocumento.findFirst.mockResolvedValue({ versao: 3 });
    await POST(uploadRequest());
    expect(dbMock.arquivoDocumento.create).toHaveBeenCalledWith({ data: expect.objectContaining({ versao: 4 }) });
  });
  it("DOC-06 arquivo obrigatorio retorna 400", async () => {
    expect((await POST(uploadRequest("application/pdf", false))).status).toBe(400);
    expect(uploadFile).not.toHaveBeenCalled();
  });
  it("DOC-07 tipo proibido retorna 400 sem upload", async () => {
    expect((await POST(uploadRequest("text/html"))).status).toBe(400);
    expect(uploadFile).not.toHaveBeenCalled();
  });
  it("DOC-08 arquivo maior que 10 MB retorna 400", async () => {
    const form = new FormData();
    for (const [key, value] of Object.entries(metadata)) form.set(key, String(value));
    form.set("arquivo", new File([new Uint8Array(10 * 1024 * 1024 + 1)], "grande.pdf", { type: "application/pdf" }));
    expect((await POST(new Request("http://localhost/api/documentos", { method: "POST", body: form }))).status).toBe(400);
    expect(uploadFile).not.toHaveBeenCalled();
  });
  it("DOC-09 falha no upload retorna 500 sem criar registro", async () => {
    vi.mocked(uploadFile).mockRejectedValue(new Error("caminho-interno-simulado"));
    const response = await POST(uploadRequest());
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("caminho-interno-simulado");
    expect(dbMock.arquivoDocumento.create).not.toHaveBeenCalled();
  });
  it("DOC-10 atualiza metadados, status e ordem", async () => {
    const response = await PATCH(jsonRequest("/api/documentos/x", { ...metadata, status: "INATIVO", ordem: 4 }, "PATCH"), params);
    expect(response.status).toBe(200);
    expect(dbMock.arquivoDocumento.update).toHaveBeenCalledWith({ where: { id: record.id }, data: { ...metadata, status: "INATIVO", ordem: 4 } });
  });
  it("DOC-11 edicao ausente retorna 404", async () => {
    dbMock.arquivoDocumento.findUnique.mockResolvedValue(null);
    expect((await PATCH(jsonRequest("/api/documentos/x", metadata, "PATCH"), params)).status).toBe(404);
  });
  it("DOC-12 edicao invalida retorna 400 sem gravar", async () => {
    expect((await PATCH(jsonRequest("/api/documentos/x", {}, "PATCH"), params)).status).toBe(400);
    expect(dbMock.arquivoDocumento.update).not.toHaveBeenCalled();
  });
  it("DOC-13 status invalido retorna 400", async () => expect((await PATCH(jsonRequest("/api/documentos/x", { ...metadata, status: "INVALIDO" }, "PATCH"), params)).status).toBe(400));
  it("DOC-14 exclui arquivo simulado e registro", async () => {
    const response = await DELETE(jsonRequest("/api/documentos/x", {}, "DELETE"), params);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(deleteFile).toHaveBeenCalledWith(record.caminho);
    expect(dbMock.arquivoDocumento.delete).toHaveBeenCalledWith({ where: { id: record.id } });
  });
  it("DOC-15 exclusao ausente retorna 404 sem remover arquivo", async () => {
    dbMock.arquivoDocumento.findUnique.mockResolvedValue(null);
    expect((await DELETE(jsonRequest("/api/documentos/x", {}, "DELETE"), params)).status).toBe(404);
    expect(deleteFile).not.toHaveBeenCalled();
  });
  it("DOC-16 conteudo textual no campo arquivo retorna 400", async () => {
    const form = new FormData();
    for (const [key, value] of Object.entries(metadata)) form.set(key, String(value));
    form.set("arquivo", "arquivo-invalido");
    expect((await POST(new Request("http://localhost/api/documentos", { method: "POST", body: form }))).status).toBe(400);
  });
});
