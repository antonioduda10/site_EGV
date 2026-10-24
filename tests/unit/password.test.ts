import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("Senhas com bcrypt real", () => {
  it("PASSWORD-01 gera hash verificavel sem armazenar texto puro", async () => {
    const fictitiousPassword = "somente-teste-automatizado";
    const hash = await hashPassword(fictitiousPassword);
    expect(hash).not.toBe(fictitiousPassword);
    expect(await verifyPassword(fictitiousPassword, hash)).toBe(true);
    expect(await verifyPassword("incorreta", hash)).toBe(false);
  });
  it("PASSWORD-02 usa salts distintos", async () => {
    expect(await hashPassword("teste-local")).not.toBe(await hashPassword("teste-local"));
  });
});
