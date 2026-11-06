import { beforeEach, describe, expect, it, vi } from "vitest";
import { getServerSession } from "next-auth";
import { GET, POST } from "@/app/api/usuarios/route";
import { PATCH, DELETE } from "@/app/api/usuarios/[id]/route";
import { hashPassword } from "@/lib/password";
import { safeUserSelect } from "@/lib/safe-user";
import { dbMock } from "../mocks/db";
import { jsonRequest, params, testSession } from "../helpers";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/password", () => ({ hashPassword: vi.fn() }));
const internal = { id: "record-test", nome: "Pessoa de teste", email: "pessoa@example.invalid", status: "ATIVO", superAdmin: false, dataCadastro: new Date(), perfis: [], permissoes: [], senhaHash: "credencial-interna-simulada", sessaoVersao: 9, passwordResetTokens: [{ token: "valor-simulado" }] };

function projected(selection?: Record<string, unknown>) {
  if (!selection) return internal;
  return Object.fromEntries(Object.keys(selection).filter((key) => selection[key]).map((key) => [key, internal[key as keyof typeof internal]]));
}

function assertSafe(value: unknown) {
  expect(value).not.toHaveProperty("senhaHash");
  expect(value).not.toHaveProperty("senha");
  expect(value).not.toHaveProperty("sessaoVersao");
  expect(value).not.toHaveProperty("passwordResetTokens");
}

beforeEach(() => {
  vi.mocked(getServerSession).mockResolvedValue(testSession);
  vi.mocked(hashPassword).mockResolvedValue("credencial-interna-simulada");
  dbMock.usuario.findMany.mockImplementation(async ({ select }) => [projected(select)]);
  dbMock.usuario.findUnique.mockImplementation(async ({ select }) => projected(select));
  dbMock.usuario.create.mockImplementation(async ({ select }) => projected(select));
  dbMock.usuario.update.mockImplementation(async ({ select }) => projected(select));
  dbMock.perfil.findUnique.mockResolvedValue({ id: "perfil-test", nome: "Docente" });
  dbMock.usuarioPerfil.create.mockResolvedValue({ id: "vinculo-test" });
  dbMock.usuarioPerfil.deleteMany.mockResolvedValue({ count: 1 });
  dbMock.$transaction.mockImplementation(async (operation: (tx: typeof dbMock) => Promise<unknown>) => operation(dbMock));
});

describe("AULA12 respostas de usuarios por allowlist", () => {
  it("SEC-USER-01 listagem nunca serializa credencial, versao ou reset", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const json = await response.json();
    assertSafe(json[0]);
    expect(dbMock.usuario.findMany).toHaveBeenCalledWith(expect.objectContaining({ select: safeUserSelect }));
  });
  it("SEC-USER-02 criacao nao retorna hash e conserva autorizacao", async () => {
    const response = await POST(jsonRequest("/api/usuarios", { nome: internal.nome, email: internal.email, senha: "x".repeat(20), perfil: "Docente" }));
    expect(response.status).toBe(201);
    assertSafe(await response.json());
    expect(dbMock.usuario.create).toHaveBeenCalledWith(expect.objectContaining({ select: safeUserSelect }));
    expect(dbMock.usuarioPerfil.create).toHaveBeenCalled();
  });
  it("SEC-USER-03 atualizacao nao retorna hash", async () => {
    const response = await PATCH(jsonRequest("/api/usuarios/x", { nome: "Nome atualizado" }, "PATCH"), params);
    expect(response.status).toBe(200);
    assertSafe(await response.json());
    expect(dbMock.usuario.update).toHaveBeenCalledWith(expect.objectContaining({ select: safeUserSelect }));
  });
  it.each(["create", "update"])("SEC-USER-04 senha curta rejeitada no servidor (%s)", async (action) => {
    const body = { nome: internal.nome, email: internal.email, senha: "x".repeat(14), perfil: "Docente" };
    const response = action === "create" ? await POST(jsonRequest("/api/usuarios", body)) : await PATCH(jsonRequest("/api/usuarios/x", body, "PATCH"), params);
    expect(response.status).toBe(400);
    expect(hashPassword).not.toHaveBeenCalled();
    assertSafe(await response.json());
  });
  it("SEC-USER-05 trocar senha revoga versao de sessoes sem retornar estado interno", async () => {
    const response = await PATCH(jsonRequest("/api/usuarios/x", { senha: "x".repeat(20) }, "PATCH"), params);
    expect(response.status).toBe(200);
    assertSafe(await response.json());
    expect(dbMock.usuario.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ sessaoVersao: { increment: 1 } }) }));
  });
  it.each([null, { ...testSession, invalidated: true }, { ...testSession, user: { ...testSession.user, roles: ["Docente"] } }])("SEC-USER-06 leitura/escrita sem autorizacao retorna 403 (%#)", async (session) => {
    vi.mocked(getServerSession).mockResolvedValue(session);
    for (const response of [await GET(), await POST(jsonRequest("/api/usuarios", {})), await PATCH(jsonRequest("/api/usuarios/x", {}, "PATCH"), params), await DELETE(jsonRequest("/api/usuarios/x", {}, "DELETE"), params)]) expect(response.status).toBe(403);
    expect(dbMock.usuario.create).not.toHaveBeenCalled();
    expect(dbMock.usuario.update).not.toHaveBeenCalled();
  });
});
