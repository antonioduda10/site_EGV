import type { CredentialsConfig } from "next-auth/providers/credentials";
import type { JWT } from "next-auth/jwt";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authOptions } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { dbMock } from "../mocks/db";
import { testSession, testUser } from "../helpers";
import { SESSION_IDLE_TIMEOUT_MS } from "@/lib/session-policy";

vi.mock("@/lib/password", () => ({ verifyPassword: vi.fn() }));
const provider = authOptions.providers[0] as CredentialsConfig;
const authorize = (credentials?: Record<string, string>) => (provider.options?.authorize ?? provider.authorize)(credentials, {});
const jwt = (token: JWT, user?: { id: string; name: string; email: string; sessionVersion?: number }) => {
  const callback = authOptions.callbacks!.jwt!;
  return callback({ token, user: user ?? { id: "" }, account: null, ...(user ? {} : { user: undefined }) } as Parameters<typeof callback>[0]);
};
const activityUpdate = (token: JWT) => {
  const callback = authOptions.callbacks!.jwt!;
  return callback({ token, trigger: "update", session: { activity: true, lastActivityAt: Date.now() + 999999999, roles: ["Admin"] } } as Parameters<typeof callback>[0]);
};

afterEach(() => { vi.useRealTimers(); });

beforeEach(() => {
  dbMock.usuario.findUnique.mockResolvedValue(testUser);
  dbMock.$queryRaw.mockResolvedValue([{ sessaoVersao: 1 }]);
  dbMock.$executeRawUnsafe.mockResolvedValue(0);
  dbMock.$executeRaw.mockResolvedValue(1);
  vi.mocked(verifyPassword).mockResolvedValue(true);
});

describe("NextAuth Credentials", () => {
  const incompleteCredentials: Array<Record<string, string> | undefined> = [undefined, {}, { email: "teste@example.invalid" }, { password: "ficticia" }];
  it.each(incompleteCredentials)("AUTH-01 rejeita campos ausentes (%j)", async (credentials) => {
    expect(await authorize(credentials)).toBeNull();
    expect(dbMock.usuario.findUnique).not.toHaveBeenCalled();
  });
  it("AUTH-02 rejeita usuario inexistente", async () => {
    dbMock.usuario.findUnique.mockResolvedValue(null);
    expect(await authorize({ email: "ausente@example.invalid", password: "ficticia" })).toBeNull();
    expect(verifyPassword).not.toHaveBeenCalled();
  });
  it("AUTH-03 rejeita senha incorreta sem registrar presenca", async () => {
    vi.mocked(verifyPassword).mockResolvedValue(false);
    expect(await authorize({ email: testUser.email, password: "incorreta" })).toBeNull();
    expect(dbMock.$executeRaw).not.toHaveBeenCalled();
  });
  it("AUTH-04 autentica usuario valido sem expor hash", async () => {
    const result = await authorize({ email: testUser.email, password: "senha-ficticia" });
    expect(result).toEqual({ id: testUser.id, name: testUser.nome, email: testUser.email, sessionVersion: 1 });
    expect(result).not.toHaveProperty("senhaHash");
    expect(dbMock.$executeRaw).toHaveBeenCalled();
  });
  it("AUTH-05 bloqueia usuario inativo", async () => {
    dbMock.usuario.findUnique.mockResolvedValue({ ...testUser, status: "INATIVO" });
    expect(await authorize({ email: testUser.email, password: "senha-ficticia" })).toBeNull();
    expect(dbMock.$executeRaw).not.toHaveBeenCalled();
  });
  it("AUTH-06 falha no rastreio de presenca nao bloqueia login valido", async () => {
    dbMock.$executeRaw.mockRejectedValue(new Error("presenca indisponivel"));
    expect(await authorize({ email: testUser.email, password: "senha-ficticia" })).toHaveProperty("id", testUser.id);
  });
  it("AUTH-07 conserva fallback de versao para banco antigo", async () => {
    dbMock.$queryRaw.mockRejectedValue(new Error("coluna ausente"));
    expect(await authorize({ email: testUser.email, password: "senha-ficticia" })).toHaveProperty("sessionVersion", 1);
  });
});

describe("Callbacks JWT e sessao", () => {
  it("AUTH-08 atualiza perfis e permissoes a partir do banco", async () => {
    const token = await jwt({}, { id: testUser.id, name: testUser.nome, email: testUser.email, sessionVersion: 1 });
    expect(token).toMatchObject({ userId: testUser.id, roles: ["Comunicação"], permissions: ["NEWS_WRITE"], invalidated: false });
    expect(token).not.toHaveProperty("senhaHash");
  });
  it("AUTH-09 usuario removido invalida token", async () => {
    dbMock.usuario.findUnique.mockResolvedValue(null);
    expect(await jwt({ userId: testUser.id, sessionVersion: 1 })).toMatchObject({ userId: null, invalidated: true, roles: [], permissions: [], superAdmin: false });
  });
  it("AUTH-10 alteracao de versao encerra sessao", async () => {
    dbMock.$queryRaw.mockResolvedValue([{ sessaoVersao: 2 }]);
    expect(await jwt({ userId: testUser.id, sessionVersion: 1 })).toMatchObject({ userId: null, invalidated: true });
  });
  it("AUTH-11 inativacao encerra sessao existente", async () => {
    dbMock.usuario.findUnique.mockResolvedValue({ ...testUser, status: "INATIVO" });
    expect(await jwt({ userId: testUser.id, sessionVersion: 1 })).toMatchObject({ userId: null, invalidated: true });
  });
  it("AUTH-12 token anonimo nao consulta banco", async () => {
    expect(await jwt({})).toEqual({});
    expect(dbMock.usuario.findUnique).not.toHaveBeenCalled();
  });
  it("AUTH-13 sessao transporta somente dados publicos do token", async () => {
    const callback = authOptions.callbacks!.session!;
    const token: JWT = { userId: testUser.id, roles: ["Docente"], permissions: [], superAdmin: false, email: testUser.email, name: testUser.nome };
    const result = await callback({ session: structuredClone(testSession), token, user: { id: testUser.id, email: testUser.email, emailVerified: null }, newSession: undefined, trigger: "update" });
    expect(result).toMatchObject({ invalidated: false, user: { id: testUser.id, roles: ["Docente"] } });
    expect(result.user).not.toHaveProperty("senhaHash");
  });
  it("AUTH-14 sessao invalidada remove id", async () => {
    const callback = authOptions.callbacks!.session!;
    const result = await callback({ session: structuredClone(testSession), token: { userId: null, invalidated: true, roles: [], permissions: [] }, user: { id: testUser.id, email: testUser.email, emailVerified: null }, newSession: undefined, trigger: "update" });
    expect(result).toMatchObject({ invalidated: true, user: { id: "" } });
  });
  it("AUTH-15 expira apos 30 minutos sem atividade", async () => {
    const token = await jwt({ userId: testUser.id, sessionVersion: 1, lastActivityAt: Date.now() - SESSION_IDLE_TIMEOUT_MS });
    expect(token).toMatchObject({ userId: null, invalidated: true, invalidatedReason: "idle", roles: [], permissions: [] });
    expect(dbMock.usuario.findUnique).not.toHaveBeenCalled();
  });
  it("AUTH-16 consulta automatica nao renova o prazo de inatividade", async () => {
    const activity = Date.now() - 60_000;
    expect(await jwt({ userId: testUser.id, sessionVersion: 1, lastActivityAt: activity })).toMatchObject({ lastActivityAt: activity, invalidated: false });
  });
  it("AUTH-17 atividade renova com horario do servidor e preserva RBAC", async () => {
    vi.useFakeTimers();
    const now = new Date("2026-10-17T12:00:00Z");
    vi.setSystemTime(now);
    const token = await activityUpdate({ userId: testUser.id, sessionVersion: 1, lastActivityAt: now.getTime() - 60_000 });
    expect(token).toMatchObject({ lastActivityAt: now.getTime(), roles: ["Comunicação"], superAdmin: false, invalidated: false });
  });
  it("AUTH-18 sessao expirada nao pode ser reativada por update", async () => {
    expect(await activityUpdate({ userId: testUser.id, sessionVersion: 1, lastActivityAt: Date.now() - SESSION_IDLE_TIMEOUT_MS })).toMatchObject({ userId: null, invalidated: true, invalidatedReason: "idle" });
  });
  it("AUTH-19 cookie anterior a revisao continua valido", async () => {
    expect(await jwt({ userId: testUser.id, sessionVersion: 1 })).toMatchObject({ userId: testUser.id, lastActivityAt: expect.any(Number), invalidated: false });
  });
  it("AUTH-20 conserva acesso antes de completar o limite", async () => {
    expect(await jwt({ userId: testUser.id, sessionVersion: 1, lastActivityAt: Date.now() - SESSION_IDLE_TIMEOUT_MS + 1000 })).toMatchObject({ userId: testUser.id, invalidated: false });
  });
  it("AUTH-21 update nao reativa token revogado", async () => {
    expect(await activityUpdate({ userId: null, invalidated: true, invalidatedReason: "revoked" })).toMatchObject({ userId: null, invalidated: true });
    expect(dbMock.usuario.findUnique).not.toHaveBeenCalled();
  });
});
