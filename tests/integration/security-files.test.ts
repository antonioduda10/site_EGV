import path from "node:path";
import fs from "fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getServerSession } from "next-auth";
import { GET as download } from "@/app/api/documentos/[id]/download/route";
import { GET as rawFile } from "@/app/api/uploads/[...path]/route";
import { dbMock } from "../mocks/db";
import { params, testSession } from "../helpers";
import { getUploadRoot } from "@/lib/upload-path";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("fs/promises", () => ({ default: { readFile: vi.fn(), realpath: vi.fn() } }));
const doc = { id: "record-test", nome: "Documento de teste", status: "INATIVO", tipo: "application/pdf", caminho: "/api/uploads/documentos/teste.pdf" };
const request = new Request("http://localhost/api/arquivo");

beforeEach(() => {
  vi.mocked(getServerSession).mockResolvedValue(null);
  vi.mocked(fs.realpath).mockImplementation(async (value) => String(value));
  vi.mocked(fs.readFile).mockResolvedValue(Buffer.from("%PDF-1.4\n%%EOF"));
  dbMock.arquivoDocumento.findUnique.mockResolvedValue(doc);
  dbMock.arquivoDocumento.findMany.mockResolvedValue([doc]);
});

describe("AULA12 download e caminho bruto obedecem mesma restricao", () => {
  it("SEC-FILE-01 visitante nao baixa documento inativo por ID", async () => {
    expect((await download(request, params)).status).toBe(404);
    expect(fs.readFile).not.toHaveBeenCalled();
  });
  it("SEC-FILE-02 URL bruta nao contorna status INATIVO", async () => {
    expect((await rawFile(request, { params: { path: ["documentos", "teste.pdf"] } })).status).toBe(404);
    expect(fs.readFile).not.toHaveBeenCalled();
  });
  it("SEC-FILE-03 permissao de outro modulo nao permite baixar documento inativo", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ ...testSession, user: { ...testSession.user, roles: ["Docente"] } });
    expect((await download(request, params)).status).toBe(404);
  });
  it("SEC-FILE-04 administrador autorizado conserva download e URL bruta", async () => {
    vi.mocked(getServerSession).mockResolvedValue(testSession);
    expect((await download(request, params)).status).toBe(200);
    expect((await rawFile(request, { params: { path: ["documentos", "teste.pdf"] } })).status).toBe(200);
  });
  it("SEC-FILE-05 documento ativo continua publico com nosniff e sem cache compartilhado", async () => {
    dbMock.arquivoDocumento.findUnique.mockResolvedValue({ ...doc, status: "ATIVO" });
    const response = await download(request, params);
    expect(response.status).toBe(200);
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it.each(["../fora.pdf", path.resolve(getUploadRoot(), "..", "uploads-privado", "fora.pdf")])("SEC-FILE-06 caminho externo vindo do banco nao e lido (%#)", async (caminho) => {
    dbMock.arquivoDocumento.findUnique.mockResolvedValue({ ...doc, caminho, status: "ATIVO" });
    expect((await download(request, params)).status).toBe(404);
    expect(fs.readFile).not.toHaveBeenCalled();
  });
  it("SEC-FILE-07 imagem nao publicada nao vaza por URL bruta", async () => {
    dbMock.arquivoDocumento.findMany.mockResolvedValue([]);
    dbMock.noticia.findMany.mockResolvedValue([]);
    expect((await rawFile(request, { params: { path: ["noticias", "rascunho.png"] } })).status).toBe(404);
    expect(fs.readFile).not.toHaveBeenCalled();
  });
});
