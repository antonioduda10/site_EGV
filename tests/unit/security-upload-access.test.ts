import path from "node:path";
import { beforeEach, expect, it, vi } from "vitest";
import { getServerSession } from "next-auth";
import { canReadUpload } from "@/lib/upload-access";
import { getUploadRoot } from "@/lib/upload-path";
import { dbMock } from "../mocks/db";
import { testSession } from "../helpers";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
beforeEach(() => {
  vi.mocked(getServerSession).mockResolvedValue(null);
  for (const model of [dbMock.arquivoDocumento, dbMock.noticia, dbMock.evento, dbMock.paginaInstitucional, dbMock.banner, dbMock.secretariaServidor, dbMock.midia]) model.findMany.mockResolvedValue([]);
  dbMock.configuracaoSite.findFirst.mockResolvedValue(null);
  dbMock.$queryRaw.mockResolvedValue([]);
});
const target = (name: string) => path.join(getUploadRoot(), name);

it.each(["noticias", "eventos", "paginas", "banners", "secretaria", "midia", "config", "documentos"])("SEC-ASSET administrador autorizado visualiza previa na categoria %s", async (folder) => {
  vi.mocked(getServerSession).mockResolvedValue(testSession);
  expect(await canReadUpload(target(`${folder}/teste.png`))).toBe(true);
});
it("SEC-ASSET noticia publica e HTML rico vinculam arquivo real", async () => {
  dbMock.noticia.findMany.mockResolvedValue([{ imagemCapa: null, conteudo: '<p><img src="/api/uploads/noticias/teste.png"></p>' }]);
  expect(await canReadUpload(target("noticias/teste.png"))).toBe(true);
  expect(await canReadUpload(target("noticias/outro.png"))).toBe(false);
});
it.each([
  ["eventos", "evento", { conteudo: '<img src="/api/uploads/eventos/teste.png">' }],
  ["paginas", "paginaInstitucional", { conteudo: '<img src="/api/uploads/paginas/teste.png">' }],
  ["banners", "banner", { imagem: "/api/uploads/banners/teste.png" }],
  ["secretaria", "secretariaServidor", { fotoUrl: "/api/uploads/secretaria/teste.png" }],
  ["midia", "midia", { caminho: "/api/uploads/midia/teste.png" }]
] as const)("SEC-ASSET visitante recebe arquivo de %s com vinculo publico", async (folder, model, record) => {
  dbMock[model].findMany.mockResolvedValue([record]);
  expect(await canReadUpload(target(`${folder}/teste.png`))).toBe(true);
  expect(await canReadUpload(target(`${folder}/outro.png`))).toBe(false);
});
it("SEC-ASSET logo e conteudo legal conservam acesso publico", async () => {
  dbMock.configuracaoSite.findFirst.mockResolvedValue({ logoUrl: "/api/uploads/config/logo.png", politicaPrivacidade: '<img src="/api/uploads/config/teste.png">' });
  expect(await canReadUpload(target("config/logo.png"))).toBe(true);
  expect(await canReadUpload(target("config/teste.png"))).toBe(true);
  expect(await canReadUpload(target("config/orfao.png"))).toBe(false);
});
it("SEC-ASSET arquivo legado orfao nao se torna publico nem por outra permissao", async () => {
  expect(await canReadUpload(target("orfao.png"))).toBe(false);
  vi.mocked(getServerSession).mockResolvedValue(testSession);
  expect(await canReadUpload(target("orfao.png"))).toBe(false);
});
