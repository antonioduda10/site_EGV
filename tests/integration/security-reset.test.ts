import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/auth/reset/route";
import { POST as forgot } from "@/app/api/auth/forgot/route";
import { hashPassword } from "@/lib/password";
import { dbMock } from "../mocks/db";
import { jsonRequest } from "../helpers";

vi.mock("@/lib/password", () => ({ hashPassword: vi.fn() }));
beforeEach(() => {
  dbMock.$transaction.mockImplementation(async (operation: (tx: typeof dbMock) => Promise<unknown>) => operation(dbMock));
  dbMock.passwordResetToken.findUnique.mockResolvedValue({ usuarioId: "user-test", token: "identificador-simulado", expiraEm: new Date(Date.now() + 60000) });
  dbMock.passwordResetToken.deleteMany.mockResolvedValue({ count: 1 });
  dbMock.usuario.update.mockResolvedValue({ id: "user-test" });
  vi.mocked(hashPassword).mockResolvedValue("credencial-simulada");
});

describe("AULA12 redefinicao de senha", () => {
  it("SEC-RESET-01 senha curta e rejeitada antes de consultar segredo", async () => {
    expect((await POST(jsonRequest("/api/auth/reset", { token: "identificador-simulado", senha: "x".repeat(14) }))).status).toBe(400);
    expect(hashPassword).not.toHaveBeenCalled();
    expect(dbMock.passwordResetToken.findUnique).not.toHaveBeenCalled();
  });
  it("SEC-RESET-02 senha forte, consumo unico e revogacao de sessoes", async () => {
    const response = await POST(jsonRequest("/api/auth/reset", { token: "identificador-simulado", senha: "x".repeat(64) }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(dbMock.usuario.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ sessaoVersao: { increment: 1 } }), select: { id: true } }));
    expect(dbMock.passwordResetToken.deleteMany).toHaveBeenCalledTimes(2);
  });
  it.each(["ausente", "expirado", "concorrente"])("SEC-RESET-03 identificador inutilizavel nao altera senha (%s)", async (kind) => {
    if (kind === "ausente") dbMock.passwordResetToken.findUnique.mockResolvedValue(null);
    if (kind === "expirado") dbMock.passwordResetToken.findUnique.mockResolvedValue({ expiraEm: new Date(0) });
    if (kind === "concorrente") dbMock.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });
    expect((await POST(jsonRequest("/api/auth/reset", { token: "identificador-simulado", senha: "x".repeat(20) }))).status).toBe(400);
    expect(dbMock.usuario.update).not.toHaveBeenCalled();
    expect(hashPassword).not.toHaveBeenCalled();
  });
  it("SEC-RESET-04 recuperacao responde igualmente para conta existente ou ausente", async () => {
    dbMock.passwordResetToken.create.mockResolvedValue({});
    dbMock.usuario.findUnique.mockResolvedValue({ id: "user-test" });
    const present = await forgot(jsonRequest("/api/auth/forgot", { email: "teste@example.invalid" }));
    dbMock.usuario.findUnique.mockResolvedValue(null);
    const missing = await forgot(jsonRequest("/api/auth/forgot", { email: "ausente@example.invalid" }));
    expect(await present.json()).toEqual(await missing.json());
    expect(present.status).toBe(missing.status);
  });
});
