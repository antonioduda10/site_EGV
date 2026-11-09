import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { requireDevelopmentSeed, validateLocalDatabase } from "@/tools/development/local-database";
import { DEVELOPMENT_ADMIN_EMAIL, ensureDevelopmentAdmin } from "@/tools/development/seed-admin";
import { developmentPassword } from "@/tools/development/private-credentials";
import { verifyPassword } from "@/lib/password";
import { hashPassword } from "@/lib/password";
import bcrypt from "bcryptjs";

const local = { running: true, database: "test_only", user: "test_only", ports: ["5433"] };
const url = () => new URL("postgresql://test_only@127.0.0.1:5433/test_only");
const { writesUserData } = require("../../deploy/migration-policy.cjs") as { writesUserData(sql: string): boolean };
const { matchesCandidate } = require("../../deploy/check-production-users.cjs") as { matchesCandidate(candidate: string, hash: string): Promise<boolean> };

describe("Isolamento do seed e preservacao de credenciais", () => {
  it("exige autorizacao explicita e recusa NODE_ENV de producao antes de abrir o banco", () => {
    expect(() => requireDevelopmentSeed({})).toThrow();
    expect(() => requireDevelopmentSeed({ NODE_ENV: "production", EGV_ALLOW_DEV_SEED: "1" })).toThrow();
    expect(() => validateLocalDatabase(url(), local, "production")).toThrow();
  });
  it.each([
    "postgresql://test_only@db:5433/test_only", "postgresql://test_only@179.66.135.203:5433/test_only",
    "postgresql://test_only@127.0.0.1:3306/test_only", "postgresql://test_only@127.0.0.1:5433/other",
    "postgresql://other@127.0.0.1:5433/test_only", "postgresql://test_only@127.0.0.1:5433/test_only?schema=other"
  ])("recusa destino nao comprovado: %s", (value) => {
    expect(() => validateLocalDatabase(new URL(value), local, "development")).toThrow();
  });
  it("aceita somente o banco e a porta correspondentes ao container local ativo", () => {
    expect(() => validateLocalDatabase(url(), local, "development")).not.toThrow();
    expect(() => validateLocalDatabase(url(), { ...local, running: false })).toThrow();
  });
  it("gera credenciais aleatorias longas, nao padroes compartilhados", () => {
    const first = developmentPassword();
    expect(first.length).toBeGreaterThanOrEqual(32);
    expect(first === developmentPassword()).toBe(false);
  });
  it("nao altera nem gera credenciais para um usuario ja existente", async () => {
    const db = { usuario: { findUnique: vi.fn().mockResolvedValue({ id: "existing" }), create: vi.fn() } };
    const store = vi.fn(), applied = vi.fn();
    expect(await ensureDevelopmentAdmin(db, store, applied)).toEqual({ id: "existing", created: false });
    expect(store).not.toHaveBeenCalled();
    expect(db.usuario.create).not.toHaveBeenCalled();
    expect(applied).not.toHaveBeenCalled();
  });
  it("cria apenas o administrador ficticio local com hash verificavel e sem expor a senha no retorno", async () => {
    const db = { usuario: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({ id: "new" }) } };
    const store = vi.fn().mockReturnValue("private-test-file"), applied = vi.fn();
    const result = await ensureDevelopmentAdmin(db, store, applied);
    const [email, password] = store.mock.calls[0] as [string, string];
    expect(email).toBe(DEVELOPMENT_ADMIN_EMAIL);
    const args = db.usuario.create.mock.calls[0][0];
    expect(await verifyPassword(password, args.data.senhaHash)).toBe(true);
    expect(args.data.senhaHash === password).toBe(false);
    expect(result).not.toHaveProperty("password");
    expect(result).not.toHaveProperty("senhaHash");
    expect(applied).toHaveBeenCalledWith("private-test-file");
  });
  it("nao sobrescreve uma conta criada concorrentemente", async () => {
    const db = { usuario: { findUnique: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "concurrent" }), create: vi.fn().mockRejectedValue({ code: "P2002" }) } };
    expect(await ensureDevelopmentAdmin(db, () => "unused-private-file", vi.fn())).toEqual({ id: "concurrent", created: false });
  });
  it("auditoria verifica formato moderno e bcrypt antigo, sem ignorar um protocolo de hash", async () => {
    const candidate = developmentPassword();
    expect(await matchesCandidate(candidate, await hashPassword(candidate))).toBe(true);
    expect(await matchesCandidate(candidate, await bcrypt.hash(candidate, 10))).toBe(true);
    expect(await matchesCandidate(developmentPassword(), await hashPassword(candidate))).toBe(false);
    expect(await matchesCandidate(candidate, "egv-bcrypt-sha384-v1:invalid:invalid")).toBe(false);
  });
  it.each(['UPDATE "Usuario" SET "senhaHash" = NULL;', 'INSERT INTO public."Usuario" (id) VALUES (NULL);', 'COPY "Usuario" FROM STDIN;', 'MERGE INTO "Usuario" USING another ON false WHEN MATCHED THEN DELETE;'])("bloqueia DML de usuarios em migrations automaticas", (sql) => {
    expect(writesUserData(sql)).toBe(true);
  });
  it("preserva DDL e comprova que as migrations atuais nao escrevem credenciais", () => {
    expect(writesUserData('ALTER TABLE "Usuario" ADD COLUMN example TEXT;')).toBe(false);
    for (const folder of readdirSync("prisma/migrations", { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
      expect(writesUserData(readFileSync(`prisma/migrations/${folder.name}/migration.sql`, "utf8"))).toBe(false);
    }
  });
  it("deploy nao chama seed, reset, db push ou restauracao/importacao", () => {
    const script = readFileSync("deploy/bin/deploy.sh", "utf8");
    expect(script).not.toMatch(/db\s+seed|migrate\s+reset|db\s+push|import-local|restore-db|pg_restore/);
    const dockerfile = readFileSync("Dockerfile", "utf8");
    expect(dockerfile).toContain("migrate deploy");
    expect(dockerfile).not.toMatch(/COPY prisma \.\/prisma/);
    expect(dockerfile).not.toMatch(/db\s+seed|migrate\s+reset|db\s+push/);
    const manifest = JSON.parse(readFileSync("package.json", "utf8"));
    expect(manifest.scripts["prisma:migrate"]).toContain("--skip-seed");
  });
});
