import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/auth/login/route";
import { verifyPassword } from "@/lib/password";
import { dbMock } from "../mocks/db";
import { jsonRequest, testUser } from "../helpers";

vi.mock("@/lib/password", () => ({ verifyPassword: vi.fn() }));
const request = () => jsonRequest("/api/auth/login", { email: testUser.email, senha: "senha-ficticia" });
beforeEach(() => {
  dbMock.usuario.findUnique.mockResolvedValue(testUser);
  vi.mocked(verifyPassword).mockResolvedValue(true);
});
describe("API auxiliar de login", () => {
  it("LOGIN-01 dados invalidos retornam 400", async () => {
    expect((await POST(jsonRequest("/api/auth/login", { email: "invalido", senha: "x" }))).status).toBe(400);
    expect(dbMock.usuario.findUnique).not.toHaveBeenCalled();
  });
  it("LOGIN-02 usuario inexistente retorna 401", async () => {
    dbMock.usuario.findUnique.mockResolvedValue(null);
    expect((await POST(request())).status).toBe(401);
  });
  it("LOGIN-03 senha incorreta retorna 401", async () => {
    vi.mocked(verifyPassword).mockResolvedValue(false);
    expect((await POST(request())).status).toBe(401);
  });
  it("LOGIN-04 usuario inativo retorna 401", async () => {
    dbMock.usuario.findUnique.mockResolvedValue({ ...testUser, status: "INATIVO" });
    expect((await POST(request())).status).toBe(401);
  });
  it("LOGIN-05 sucesso retorna apenas identificador e ok", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, id: testUser.id });
  });
});
