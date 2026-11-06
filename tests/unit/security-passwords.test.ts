import { describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { hashPassword, verifyPassword } from "@/lib/password";
import { newPasswordSchema, usuarioSchema, usuarioUpdateSchema, loginSchema } from "@/lib/validators";
import { newPasswordError } from "@/lib/password-policy";

describe("AULA12 politica de novas senhas e compatibilidade", () => {
  it.each([0, 6, 14, 129])("SEC-PASS-01 rejeita comprimento fora da politica (%i)", (length) => {
    expect(newPasswordSchema.safeParse("x".repeat(length)).success).toBe(false);
  });
  it.each([15, 64, 128])("SEC-PASS-02 aceita comprimento permitido sem composicao artificial (%i)", (length) => {
    expect(newPasswordSchema.safeParse("x".repeat(length)).success).toBe(true);
  });
  it("SEC-PASS-03 aceita espacos e Unicode sem truncar", () => {
    expect(newPasswordError("uma frase de teste com espacos")).toBeNull();
    expect(newPasswordSchema.safeParse("🎓".repeat(64)).success).toBe(true);
    expect(newPasswordSchema.safeParse("🎓".repeat(14)).success).toBe(false);
  });
  it("SEC-PASS-04 criacao e atualizacao rejeitam senha curta mas login legado nao muda", () => {
    const legacy = randomBytes(3).toString("hex");
    expect(usuarioSchema.safeParse({ nome: "Pessoa de teste", email: "teste@example.invalid", perfil: "Docente", senha: legacy }).success).toBe(false);
    expect(usuarioUpdateSchema.safeParse({ senha: legacy }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "teste@example.invalid", senha: legacy }).success).toBe(true);
    expect(usuarioUpdateSchema.safeParse({ nome: "Pessoa de teste" }).success).toBe(true);
  });
  it("SEC-PASS-05 hash bcrypt antigo continua autenticando senha antiga", async () => {
    const legacy = randomBytes(3).toString("hex");
    const stored = await bcrypt.hash(legacy, 10);
    expect(await verifyPassword(legacy, stored)).toBe(true);
  });
  it("SEC-PASS-06 distingue sufixos depois de 72 bytes", async () => {
    const prefix = randomBytes(40).toString("hex");
    const stored = await hashPassword(`${prefix}a`);
    expect(await verifyPassword(`${prefix}a`, stored)).toBe(true);
    expect(await verifyPassword(`${prefix}b`, stored)).toBe(false);
  });
  it("SEC-PASS-07 diferencia Unicode longo e nao aceita formato corrompido", async () => {
    const password = "🎓".repeat(64);
    const stored = await hashPassword(password);
    expect(await verifyPassword(password, stored)).toBe(true);
    expect(await verifyPassword(`${"🎓".repeat(63)}x`, stored)).toBe(false);
    expect(await verifyPassword(password, "egv-bcrypt-sha384-v1:corrompido")).toBe(false);
  });
});
